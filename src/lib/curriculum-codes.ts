// Maple Key curriculum taxonomy — subject-aware, grade-aware where it matters,
// degrade-friendly everywhere else.
//
// Progress checking is keyed on the OVERALL EXPECTATION (e.g. "D1"), grouped by
// STRAND (e.g. "D"), and drilled into SPECIFIC EXPECTATIONS (e.g. "D1.1"). Those
// code *relationships* are pure structure — split on "." for the overall, take
// the first letter for the strand — and hold for every Ontario subject, so they
// need no per-subject data.
//
// Human-readable LABELS are the opposite: the same code string means different
// things in different subjects ("D1.1" is data literacy in Math but a listening
// expectation in FSL) — and for some subjects, different things in different
// grades (Social Studies/History/Geography rename strand A and B every grade as
// the topic moves through history/regions). So every label lookup is keyed by
// SUBJECT first, then GRADE. Most subjects' strand/overall names are grade-stable
// (Math, Science, Language, FSL, HPE, and grades 1-6 Social Studies), so their
// tables live under the GRADE_AGNOSTIC key and apply to every grade. Subjects
// whose topics shift by grade (History, Geography) key their tables by grade
// number instead, and a lookup for an unlisted grade or subject degrades to the
// bare code — "structure now, glosses later" stays true at every level.

import { normalizeSubject } from "./subjects"

// ---- Structure (subject-independent) ----

export function overallCodeOf(code: string): string {
  return code.split(".")[0]
}

export function strandCodeOf(overall: string): string {
  return overall.charAt(0)
}

// Real expectation codes are always <strand letter(s)><overall number>[.<specific
// number>] (e.g. "D1", "D1.1"). Lesson plans can carry free-form fallback "codes"
// (short concept labels) when the AI had no curriculum code to attach to a
// question — those must never reach the coverage tree, since `strandCodeOf`
// would otherwise turn a bare/malformed token into a fake one-letter strand.
const EXPECTATION_CODE_PATTERN = /^[A-Za-z]+\d+(\.\d+)?$/

export function isExpectationCode(code: string): boolean {
  return EXPECTATION_CODE_PATTERN.test(code)
}

export function groupByOverall(codes: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const code of codes) {
    ;(out[overallCodeOf(code)] ??= []).push(code)
  }
  return out
}

export function groupByStrand(overalls: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const overall of overalls) {
    ;(out[strandCodeOf(overall)] ??= []).push(overall)
  }
  return out
}

// ---- Grade-aware lookup plumbing ----

const GRADE_AGNOSTIC = "*"

// subject -> grade (or GRADE_AGNOSTIC) -> code -> label
type GradeTable<T> = Record<string, Record<string, T>>

// Specific grade first, then the grade-agnostic table, so a subject can mix
// grade-stable strands with a few grade-specific overrides if that's ever needed.
function gradeLookup<T>(table: GradeTable<T> | undefined, grade: string | undefined, key: string): T | undefined {
  if (!table) return undefined
  return (grade && table[grade]?.[key]) ?? table[GRADE_AGNOSTIC]?.[key]
}

// ---- Strand labels (subject + grade keyed, authoritative) ----
// Strand letter → strand name. Grade-stable subjects live under GRADE_AGNOSTIC
// and apply to every grade; subjects whose strand topics change every grade
// (History, Geography) key by grade instead. Codes whose letter/grade combo
// isn't listed fall back to the bare letter.
const STRAND_LABELS: Record<string, GradeTable<string>> = {
  Math: {
    [GRADE_AGNOSTIC]: {
      A: "Social-Emotional Learning",
      B: "Number",
      C: "Algebra",
      D: "Data",
      E: "Spatial Sense",
      F: "Financial Literacy",
    },
  },
  Science: {
    [GRADE_AGNOSTIC]: {
      A: "STEM Skills & Connections",
      B: "Life Systems",
      C: "Matter and Energy",
      D: "Structures and Mechanisms",
      E: "Earth and Space Systems",
    },
  },
  "Social Studies": {
    [GRADE_AGNOSTIC]: {
      A: "Heritage and Identity",
      B: "People and Environments",
    },
  },
  Language: {
    [GRADE_AGNOSTIC]: {
      A: "Literacy Connections",
      B: "Foundations of Language",
      C: "Comprehension",
      D: "Composition",
    },
  },
  FSL: {
    [GRADE_AGNOSTIC]: {
      A: "Listening",
      B: "Speaking",
      C: "Reading",
      D: "Writing",
    },
  },
  "Health & Physical Education": {
    [GRADE_AGNOSTIC]: {
      A: "Social-Emotional Skills",
      B: "Active Living",
      C: "Movement Competence",
      D: "Healthy Living",
    },
  },
  History: {
    "7": {
      A: "New France and British North America, 1713–1800",
      B: "Canada, 1800–1850: Conflict and Challenges",
    },
    "8": {
      A: "Creating Canada, 1850–1890",
      B: "Canada, 1890–1914: A Changing Society",
    },
  },
  Geography: {
    "7": {
      A: "Physical Patterns in a Changing World",
      B: "Natural Resources Around the World: Use and Sustainability",
    },
    "8": {
      A: "Global Settlement: Patterns and Sustainability",
      B: "Global Inequalities: Economic Development and Quality of Life",
    },
  },
}

export function strandLabel(subject: string, strand: string, grade?: string): string {
  return gradeLookup(STRAND_LABELS[normalizeSubject(subject)], grade, strand) ?? strand
}

// True when we have a real strand name for this code (vs. a bare-letter fallback).
// Drives whether a dashboard groups overalls under named strand headers.
export function hasStrandLabel(subject: string, strand: string, grade?: string): boolean {
  return Boolean(gradeLookup(STRAND_LABELS[normalizeSubject(subject)], grade, strand))
}

// All strand letter/label pairs for a subject at a grade (or the grade-agnostic
// table when ungraded). Lets UI strand pickers stay in sync with this file for
// subjects whose strand names shift by grade (History, Geography) instead of
// keeping a second, grade-blind copy of the list elsewhere.
export function strandsForSubject(subject: string, grade?: string): { code: string; label: string }[] {
  const table = STRAND_LABELS[normalizeSubject(subject)]
  if (!table) return []
  const bucket = (grade && table[grade]) ?? table[GRADE_AGNOSTIC]
  if (!bucket) return []
  return Object.entries(bucket).map(([code, label]) => ({ code, label }))
}

// ---- Overall-expectation glosses (subject + grade keyed; sparse, degrade to code) ----
// Only the overalls we have human-readable names for. Everything else degrades to
// the code via overallLabel/overallTitle.
const OVERALL_LABELS: Record<string, GradeTable<string>> = {
  Math: {
    [GRADE_AGNOSTIC]: {
      D1: "Data Literacy",
      D2: "Probability",
      F1: "Financial Literacy",
    },
  },
  "Social Studies": {
    "6": {
      A1: "Application: Diversity, Inclusiveness, and Canadian Identities",
      A2: "Inquiry: The Perspectives of Diverse Communities",
      A3: "Understanding Context: The Development of Communities in Canada",
      B1: "Application: Canada and International Cooperation",
      B2: "Inquiry: Responses to Global Issues",
      B3: "Understanding Context: Canada's Global Interactions",
    },
  },
  History: {
    "7": {
      A1: "Application: Colonial and Present-day Canada",
      A2: "Inquiry: From New France to British North America",
      A3: "Understanding Historical Context: Events and Their Consequences",
      B1: "Application: Changes and Challenges",
      B2: "Inquiry: Perspectives in British North America",
      B3: "Understanding Historical Context: Events and Their Consequences",
    },
    "8": {
      A1: "Application: Peoples in the New Nation",
      A2: "Inquiry: Perspectives in the New Nation",
      A3: "Understanding Historical Context: Events and Their Consequences",
      B1: "Application: Canada – Past and Present",
      B2: "Inquiry: Perspectives on a Changing Society",
      B3: "Understanding Historical Context: Events and Their Consequences",
    },
  },
  Geography: {
    "7": {
      A1: "Application: Interrelationships between People and the Physical Environment",
      A2: "Inquiry: Investigating Physical Features and Processes",
      A3: "Understanding Geographic Context: Patterns in the Physical Environment",
      B1: "Application: Natural Resources and Sustainability",
      B2: "Inquiry: Investigating Issues Related to Natural Resources",
      B3: "Understanding Geographic Context: Using Natural Resources",
    },
    "8": {
      A1: "Application: Interrelationships between Settlement and the Environment",
      A2: "Inquiry: Human Settlements and Sustainability",
      A3: "Understanding Geographic Context: Settlement Patterns and Trends",
      B1: "Application: Global Inequalities in Quality of Life",
      B2: "Inquiry: Development and Quality of Life Issues",
      B3: "Understanding Geographic Context: Global Economic Development and Quality of Life",
    },
  },
}

// Strict gloss: the overall's real name, or the bare code when we don't have one.
// Use where a caller wants to detect "do we have a friendly name?" (label !== code).
export function overallLabel(subject: string, overall: string, grade?: string): string {
  return gradeLookup(OVERALL_LABELS[normalizeSubject(subject)], grade, overall) ?? overall
}

// Display title for an overall row. Prefers the gloss; falls back to the strand
// name as context (e.g. Science "B2" → "Life Systems") so a row never shows the
// code twice (the code is rendered separately as a badge); finally the code.
export function overallTitle(subject: string, overall: string, grade?: string): string {
  const canonical = normalizeSubject(subject)
  const gloss = gradeLookup(OVERALL_LABELS[canonical], grade, overall)
  if (gloss) return gloss
  return gradeLookup(STRAND_LABELS[canonical], grade, strandCodeOf(overall)) ?? overall
}

// ---- Specific-expectation descriptions (subject + grade keyed; sparse, may be absent) ----
// Today this carries Math Data/Probability/Financial Literacy (grade-agnostic) and
// Grade 7 History in full. Non-described codes return undefined and callers fall
// back to the bare code.
const SPECIFIC_DESCRIPTIONS: Record<string, GradeTable<string>> = {
  Math: {
    [GRADE_AGNOSTIC]: {
      // Data Literacy
      "D1.1": "describe the difference between discrete and continuous data, and provide examples of each",
      "D1.2":
        "collect qualitative data and discrete and continuous quantitative data to answer questions of interest about a population, and organize the sets of data as appropriate, including using intervals",
      "D1.3":
        "select from among a variety of graphs, including histograms and broken-line graphs, the type of graph best suited to represent various sets of data; display the data in the graphs with proper sources, titles, and labels, and appropriate scales; and justify their choice of graphs",
      "D1.4":
        "create an infographic about a data set, representing the data in appropriate ways, including in tables, histograms, and broken-line graphs, and incorporating any other relevant information that helps to tell a story about the data",
      "D1.5":
        "determine the range as a measure of spread and the measures of central tendency for various data sets, and use this information to compare two or more data sets",
      "D1.6":
        "analyse different sets of data presented in various ways, including in histograms and broken-line graphs and in misleading graphs, by asking and answering questions about the data, challenging preconceived notions, and drawing conclusions, then make convincing arguments and informed decisions",
      // Probability
      "D2.1":
        "use fractions, decimals, and percents to express the probability of events happening, represent this probability on a probability line, and use it to make predictions and informed decisions",
      "D2.2": "determine and compare the theoretical and experimental probabilities of two independent events happening",
      // Financial Literacy
      "F1.1":
        "describe the advantages and disadvantages of various methods of payment that can be used to purchase goods and services",
      "F1.2":
        "identify different types of financial goals, including earning and saving goals, and outline some key steps in achieving them",
      "F1.3": "identify and describe various factors that may help or interfere with reaching financial goals",
      "F1.4":
        "explain the concept of interest rates, and identify types of interest rates and fees associated with different accounts and loans offered by various banks and other financial institutions",
      "F1.5":
        "describe trading, lending, borrowing, and donating as different ways to distribute financial and other resources among individuals and organizations",
    },
  },
  "Social Studies": {
    "6": {
      // A1 — Application: Diversity, Inclusiveness, and Canadian Identities
      "A1.1":
        "explain how various built, physical, and social features of communities can contribute to identities in and images of a territory and/or country (e.g., memorials, landscapes, wildlife, cultural traditions), and assess the contribution of some of these features to images of and identities in Canada (e.g., resource-based communities, the Canadian winter, prairies and mountains, multicultural neighbourhoods)",
      "A1.2":
        "analyse some of the contributions that various First Nations, Métis, and Inuit communities and individuals have made to Canada (e.g., art, democratic ideas of the Haudenosaunee, guidance to fur traders and explorers, modes of transportation such as canoes and kayaks, Indigenous knowledge of plants and medicines, fishing and agricultural technologies)",
      "A1.3":
        "analyse some of the contributions that various settler/newcomer groups have made to Canadian identities (e.g., French and English communities to bilingualism, the British to the parliamentary system, Chinese labourers to the transcontinental railway, various communities to Canada's multicultural identity)",
      "A1.4":
        "explain how various groups and communities, including First Nations, Métis, and Inuit communities, have contributed to the goal of inclusiveness in Canada (e.g., women's rights, civil rights, Indigenous, and labour organizations), and assess the extent to which Canada has achieved the goal of being an inclusive society (e.g., the Charter of Rights and Freedoms, the Ontario Human Rights Code, freedom of religion, recognition of gay marriage)",
      // A2 — Inquiry: The Perspectives of Diverse Communities
      "A2.1":
        "formulate questions to guide investigations into different perspectives on the historical and/or contemporary experiences of a few distinct communities, including First Nations, Métis, and/or Inuit communities, in Canada (e.g., the reserve system, Indigenous treaty negotiations, forced relocation of Japanese Canadians, formation of heritage neighbourhoods)",
      "A2.2":
        "gather and organize information from a variety of primary and secondary sources (e.g., photographs, letters and diaries, oral stories, maps, songs, paintings, newspaper reports, interviews with Elders, online archives, treaties and wampum belts) that present different perspectives on the experience of communities in Canada",
      "A2.3":
        "analyse and construct print and digital maps as part of their investigations into different perspectives on the experiences of communities, including First Nations, Métis, and/or Inuit communities, in Canada (e.g., flow maps of community relocations, thematic maps showing ethnic origins in a community, maps identifying Indigenous places of significance)",
      "A2.4":
        "interpret and analyse information and evidence relevant to their investigations, using a variety of tools (e.g., graphic organizers to determine differences in perspectives on the Red River Resistance, line graphs of census data on community changes, photographs of newcomer experiences, diaries about community life)",
      "A2.5":
        "evaluate evidence and draw conclusions about perspectives on the historical and/or contemporary experience of a few distinct communities, including First Nations, Métis, and/or Inuit communities, in Canada",
      "A2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., perspective, ethnic group, emigrant, immigrant, colonization, decolonization, racism, displacement, relocation, settler, newcomer) and formats (e.g., dramatic pieces voicing different perspectives, culturally sensitive presentations, slideshows with photographs)",
      // A3 — Understanding Context: The Development of Communities in Canada
      "A3.1":
        "identify the traditional Indigenous and treaty territory or territories on which their community is located (e.g., Orillia on Ojibwe/Anishinaabe territory within the Williams Treaties; Sault Ste. Marie on Métis, Cree, Ojibwe territory within the Robinson-Huron Treaty)",
      "A3.2":
        "identify the main reasons why different peoples migrated to Canada (e.g., political or religious freedom, availability of land, economic opportunity, family ties, poverty, famine, forced migration of slaves and \"Home Children\")",
      "A3.3":
        "describe some key economic, political, cultural, and social aspects of life in settler/newcomer communities in Canada (e.g., land ownership, agricultural practices, religious beliefs, family life and gender roles), and identify how the culture of settlers' places of origin influenced their ways of life in Canada",
      "A3.4":
        "identify various types of communities in Canada and some ways they have contributed to the development of the country (e.g., First Nations, Inuit, Métis, French, British, and later immigrant groups; religious communities; resource towns; rural and urban communities)",
      "A3.5":
        "describe significant events or developments in the history of two or more First Nations, Métis, and/or Inuit communities in Canada (e.g., the fur trade, the Indian Act, residential schools, the reserve system, the creation of Nunavut, court challenges for recognition of rights) and how these events affected the communities' development and/or identities",
      "A3.6":
        "describe significant events or developments in the history of two or more settler/newcomer communities in Canada (e.g., expulsion of the Acadians, forced relocation of Japanese Canadians, the Underground Railroad, internment of Ukrainian Canadians) and how these events affected the communities' development and/or identities",
      "A3.7":
        "describe significant events or developments in the history of Jewish communities in Canada, including contributions to Canada (e.g., leaders in human rights, entrepreneurs in industry), and identify some of the impacts of antisemitism on these communities' development and/or identities (e.g., restrictions on immigration during WWII, prohibition of Jewish residences, responses such as building Mount Sinai Hospital and the Christie Pits Riot)",
      "A3.8":
        "describe interactions between communities in Canada, including between newcomers and groups already in the country (e.g., trade among precontact First Nations, cooperation in the fur trade, Indigenous treaties, discrimination against various groups, responses of local businesses, interactions with settlement agencies)",
      "A3.9":
        "identify key differences, including social, cultural, and/or economic differences, between a few historical and/or contemporary communities, including at least one First Nations, Métis, or Inuit community, in Canada (e.g., gender roles across cultures, class differences in industrializing cities, rural vs. urban lifestyles, differing spiritual beliefs about the land)",
      "A3.10": "describe significant changes within their own community in Canada (e.g., within their ethnic or religious community, their local community, or their region)",
      "A3.11":
        "identify and describe fundamental elements of Canadian identities (e.g., inclusiveness, respect for human rights and diversity, multiculturalism, parliamentary democracy, bilingualism, universal health care, recognition of First Nations/Métis/Inuit as Indigenous peoples, the importance of treaties)",
      // B1 — Application: Canada and International Cooperation
      "B1.1":
        "explain why Canada participates in specific international accords and organizations (e.g., NAFTA, APEC, WHO, NATO, the UN including the Declaration on the Rights of Indigenous People and the Convention on the Rights of the Child), and assess the influence of some of these accords and/or organizations",
      "B1.2":
        "analyse responses of Canadian governments, NGOs, and individual citizens to an economic, environmental, political, and/or social issue of international significance (e.g., responses to economic globalization, the spread of H1N1 or SARS, a natural disaster, child labour, child soldiers, climate change, or civil war and refugees)",
      "B1.3":
        "explain why some environmental issues are of international importance and require global participation to be effectively addressed (e.g., global warming, carbon dioxide and sulphur dioxide emissions, availability of fresh water, deforestation, overfishing, invasive species, habitat protection of migrating species)",
      // B2 — Inquiry: Responses to Global Issues
      "B2.1":
        "formulate questions to guide investigations into global issues of political, social, economic, and/or environmental importance (e.g., child labour, dwindling oil supplies, access to fresh water, climate change, food shortages, refugees, or natural disasters), their impact, and responses to the issues",
      "B2.2":
        "gather and organize information on global issues using a variety of resources and technologies (e.g., spatial technologies, satellite images, online image banks, accounts by Inuit witnesses to climate change, interactive websites on health issues)",
      "B2.3":
        "analyse and construct different types of maps, both print and digital, as part of their investigations into global issues (e.g., digital maps locating refugee camps, interactive atlases tracking disease spread, demographic maps on quality of life indicators, flow maps showing the origins of products entering Canada)",
      "B2.4":
        "interpret and analyse information and data relevant to their investigations, using a variety of tools (e.g., online mapping programs, climate graphs, graphic organizers, computer-generated graphs comparing Canadian aid responses)",
      "B2.5":
        "evaluate evidence and draw conclusions about global issues of political, social, economic, and/or environmental importance, their impact on the global community, and responses to the issues",
      "B2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., non-governmental organization, intergovernmental organization, accord, international convention, aid, relief efforts) and formats (e.g., a plan of action for a fundraising project, a fair trade report for the school newsletter, an infographic on Canadian global contributions, a map showing climate change impact)",
      // B3 — Understanding Context: Canada's Global Interactions
      "B3.1":
        "identify some of the major ways in which the Canadian government interacts with other nations (e.g., through trade agreements, military alliances, intergovernmental organizations, environmental accords, disaster relief, and funds for social and/or economic development)",
      "B3.2":
        "describe Canada's participation in different international accords, organizations, and/or programs (e.g., the UN Declaration on the Rights of Indigenous Peoples, WHO, NATO, the Blue Flag Program, UNICEF, NAFTA)",
      "B3.3":
        "describe several groups or organizations through which Canada and Canadians are involved in global issues (e.g., NGOs such as Doctors Without Borders and Free the Children; multinational corporations; intergovernmental organizations such as the UN, la Francophonie, the Commonwealth, and APEC)",
      "B3.4":
        "describe the responses of the Canadian government and some NGOs to different disasters and emergencies around the world (e.g., the 2010 earthquake in Haiti, the 2004 Indian Ocean tsunami, the AIDS pandemic in sub-Saharan Africa, poverty and drought in the Horn of Africa)",
      "B3.5":
        "describe the responses of the Canadian government to human rights violations during the Holocaust (e.g., severe immigration restrictions, the turning away of the MS St. Louis), and the impact that global changes in human rights legislation since WWII have had on Canada's responses to acts of hate (e.g., the Universal Declaration of Human Rights, the Charter of Rights and Freedoms, the Multiculturalism Act, Truth and Reconciliation Commission responses)",
      "B3.6":
        "identify some significant political, social, and economic interactions between Canada and other regions of the world, and describe some ways in which they affect these regions (e.g., stabilization from peacekeeping, development of maquiladoras from trade agreements, change in the status of women from education projects)",
      "B3.7":
        "identify and locate on a map countries and regions with which Canada has a significant interrelationship, and use longitude and latitude to locate cities in these countries/regions (e.g., Washington D.C., London, Beijing, Tokyo, Mogadishu, Nairobi, Tripoli, Mumbai, Kabul, Port-au-Prince)",
      "B3.8":
        "identify countries/regions with which Canada has a significant economic relationship (e.g., the U.S. and Mexico through NAFTA, trade with China, sources of tourists, recipients of Canadian aid) and some of the reasons why close relationships developed with these countries",
      "B3.9":
        "describe significant economic effects on Canada and Canadians of interactions between Canada and other regions of the world (e.g., loss of manufacturing jobs to lower-cost countries, the impact of trade agreements and disputes, effects of American cultural industry dominance)",
      "B3.10":
        "describe some ways in which Canada's interactions with other regions of the world have affected the environment (e.g., Canada's participation in UN tree-planting campaigns, proliferation of invasive species in the Great Lakes through international trade, over-farming from global demand for cheap cotton, sugar, cocoa, and tea)",
    },
  },
  History: {
    "7": {
      // A1 — Application: Colonial and Present-day Canada
      "A1.1":
        "analyze key similarities and differences in social values and aspects of life between people in present-day Canada and some different groups and communities, including First Nations, Métis, and Inuit communities, in Canada between 1713 and 1800 (e.g., gender roles, religious practices, living conditions, attitudes towards enslavement, social class)",
      "A1.2":
        "analyze some of the main challenges facing various individuals, groups, and/or communities, including First Nations, Métis, and Inuit, in Canada between 1713 and 1800 and ways people responded to those challenges, and assess similarities and differences between these challenges and those of people in present-day Canada",
      "A1.3":
        "analyze the displacement experienced by various groups and communities, including First Nations, Métis, and Inuit, who were living in or who came to Canada between 1713 and 1800 (e.g., expulsion of the Acadians, Loyalist migration, forced migration of enslaved African people), and compare it with present-day examples of displacement",
      // A2 — Inquiry: From New France to British North America
      "A2.1":
        "formulate questions to guide investigations into perspectives of different groups on significant events related to the shift in power from France to Britain (e.g., expulsion of the Acadians, the Seven Years' War, the Constitutional Act, 1791)",
      "A2.2":
        "gather and organize information and evidence about perspectives of different groups on significant events, using a variety of primary and secondary sources",
      "A2.3":
        "assess the credibility of sources and information relevant to their investigations (e.g., considering perspective, bias, accuracy, authenticity, purpose, and context)",
      "A2.4":
        "analyse and construct maps as part of their investigations into significant events related to the shift in power from France to Britain, with a focus on exploring spatial boundaries",
      "A2.5":
        "interpret and analyse information and evidence relevant to their investigations, using a variety of tools (e.g., graphic organizers, painting analysis)",
      "A2.6":
        "evaluate evidence and draw conclusions about perspectives of different groups and communities on significant events or issues related to the shift in power from France to Britain",
      "A2.7": "communicate the results of their inquiries using appropriate vocabulary and formats appropriate for specific audiences",
      // A3 — Understanding Historical Context: Events and Their Consequences
      "A3.1":
        "identify factors leading to key events in Canada between 1713 and 1800 (e.g., expulsion of the Acadians, the Seven Years' War, Pontiac's Resistance, Loyalist migrations), and describe their historical significance for different groups, including Indigenous communities",
      "A3.2":
        "identify a few key treaties of relevance to Indigenous people during this period, including wampum belts exchanged, and explain their significance (e.g., Treaty of Niagara 1764, Peace and Friendship Treaties, Jay Treaty 1794)",
      "A3.3":
        "identify key political and legal changes during this period (e.g., Royal Proclamation 1763, Quebec Act 1774, Constitutional Act 1791), and explain their impact on various groups, including First Nations, Métis, and Inuit",
      "A3.4":
        "identify key social and economic changes during this period (e.g., fur trade competition, Loyalist settlement, ethnogenesis of the Métis), and explain their impact on various groups",
      "A3.5":
        "describe significant aspects of daily life in various First Nations, Métis, and Inuit communities in Canada during this period (e.g., housing, clothing, gender roles, ceremonies, spiritual life)",
      "A3.6":
        "describe significant aspects of daily life of different newcomer/settler groups in Canada during this period (e.g., seigneurs and habitants in New France, Black Loyalists in Nova Scotia, Acadian farm families)",
      "A3.7":
        "describe some significant events and developments, including enslavement, that had an impact on the lived experiences and settlement of various Black individuals and communities in Canada up to and including this time",
      "A3.8":
        "describe significant interactions between various individuals, groups, and institutions in Canada during this period (e.g., the Catholic Church, Protestant churches, French and British colonial administrations)",
      "A3.9":
        "identify some significant individuals and groups in Canada during this period (e.g., Marie-Josèphe Angélique, Joseph Brant, Molly Brant, Pontiac, Thanadelthur), and explain their contribution to Canadian heritage and/or identities",
      // B1 — Application: Changes and Challenges
      "B1.1":
        "analyze social and political values and significant aspects of life for different groups, including First Nations, Métis, and Inuit, in Canada between 1800 and 1850, and assess similarities and differences with eighteenth-century Canada",
      "B1.2":
        "analyse some of the challenges facing individuals, groups, and/or communities, including First Nations, Métis, and Inuit, in Canada between 1800 and 1850 (e.g., war with the U.S., industrialization, limited political rights, discrimination), and ways people responded to those challenges",
      "B1.3":
        "analyse the displacement experienced by various groups, including Indigenous communities, who were living in or who came to Canada between 1800 and 1850 (e.g., from the War of 1812, from Rebellions of 1837–38, from European immigration), and how these groups dealt with their displacement",
      // B2 — Inquiry: Perspectives in British North America
      "B2.1":
        "formulate questions to guide investigations into perspectives of different groups on significant events affecting Canada between 1800 and 1850 (e.g., War of 1812, cholera epidemics, increased European immigration, Rebellions of 1837–38)",
      "B2.2":
        "gather and organize information and evidence about perspectives of different groups on significant events, using a variety of primary and secondary sources",
      "B2.3":
        "assess the credibility of sources and information relevant to their investigations (e.g., considering perspective, bias, accuracy, authenticity, purpose, and context)",
      "B2.4":
        "analyse and construct maps as part of their investigations into significant events affecting Canada during this period, with a focus on spatial boundaries",
      "B2.5":
        "interpret and analyse information and evidence relevant to their investigations, using a variety of tools (e.g., graphic organizers, graph analysis, painting analysis)",
      "B2.6":
        "evaluate evidence and draw conclusions about perspectives of different groups and communities on significant events or issues affecting Canada during this period",
      "B2.7": "communicate the results of their inquiries using appropriate vocabulary and formats appropriate for specific audiences",
      // B3 — Understanding Historical Context: Events and Their Consequences
      "B3.1":
        "identify factors contributing to key events and/or trends in Canada between 1800 and 1850 (e.g., War of 1812, Upper Canada Rebellion, Irish immigration, the Underground Railroad), and describe their historical significance for different groups, including Indigenous communities",
      "B3.2":
        "identify a few key treaties of relevance to Indigenous people during this period, including wampum belts exchanged, and explain their significance (e.g., Selkirk Treaty 1817, Robinson-Superior and Robinson-Huron Treaties 1850)",
      "B3.3":
        "identify key political and legal changes during this period (e.g., Abolition of Slavery Act 1833, the Durham Report, the Act of Union, responsible government), and explain their impact on various groups, including First Nations, Métis, and Inuit",
      "B3.4":
        "identify key social and economic changes during this period (e.g., increasing immigration, construction of canals and railways, cholera epidemics, the genocide of the Beothuk), and explain their impact on various groups",
      "B3.5":
        "describe various experiences, realities, challenges, and perspectives of members of Black settlements and communities across Canada, and explore how people in these settlements fostered a sense of belonging and pride in community",
      "B3.6":
        "describe significant interactions between different groups and communities in Canada during this period (e.g., French, English, First Nations, Métis, Inuit, Loyalists, African Canadians, Irish and Scottish immigrants)",
      "B3.7":
        "identify some significant individuals and groups in Canada during this period (e.g., Robert Baldwin, Isaac Brock, Tecumseh, William Lyon Mackenzie, Laura Secord, Louis-Joseph Papineau, Shawnadithit), and explain their contribution to Canadian heritage and/or identities",
    },
    "8": {
      // A1 — Application: Peoples in the New Nation
      "A1.1":
        "evaluate the importance of various internal and external factors that played a role in the creation of the Dominion of Canada and the expansion of its territory (e.g., Manifest Destiny, the American Civil War, Fenian raids, the CPR, the Red River Resistance, the North-West Resistance, the Numbered Treaties, the Indian Act)",
      "A1.2":
        "assess the impact that limitations with respect to legal status, rights, and privileges had on First Nations, Métis, and Inuit individuals and/or communities in Canada between 1850 and 1890 (e.g., the Gradual Civilization Act 1857, the Indian Act 1876, policies of assimilation, exclusion of Métis from most treaties)",
      "A1.3":
        "assess the impact that differences in legal status and in the distribution of rights and privileges had on various settler/newcomer groups in Canada between 1850 and 1890 (e.g., married women's property rights, women's political rights, restrictions on Chinese immigration, discrimination facing African Canadians)",
      "A1.4":
        "analyze some of the actions taken by various individuals, groups, and/or communities, including First Nations, Métis, and Inuit, in Canada between 1850 and 1890 to improve their lives (e.g., Métis provisional governments, labour unions, the newspaper the Provincial Freeman by Mary Ann Shadd)",
      // A2 — Inquiry: Perspectives in the New Nation
      "A2.1":
        "formulate questions to guide investigations into perspectives of different groups on significant events affecting Canada between 1850 and 1890 (e.g., Confederation, the National Policy, the Indian Act, the establishment of residential schools, the CPR, the Red River Resistance, the trial and execution of Louis Riel)",
      "A2.2":
        "gather and organize information and evidence about perspectives of different groups on significant events, using a variety of primary and secondary sources (e.g., advertisements, diaries, oral histories, editorial cartoons, petitions, photographs, testimony to commissions of inquiry)",
      "A2.3":
        "assess the credibility of sources and information relevant to their investigations (e.g., by considering perspective, bias, accuracy, authenticity, purpose, and context)",
      "A2.4":
        "analyse and construct maps as part of their investigations into significant events in Canada during this period, with a focus on exploring spatial boundaries (e.g., political/territorial expansion of Canada, routes of the Underground Railroad, Métis dispersion)",
      "A2.5":
        "interpret and analyse information and evidence relevant to their investigations, using a variety of tools (e.g., graphic organizers to compare perspectives on the Indian Act or National Policy; analysis of political speeches and newspaper articles)",
      "A2.6":
        "evaluate evidence and draw conclusions about perspectives of different groups and communities, including First Nations, Métis, and/or Inuit, on significant events or issues in Canada during this period",
      "A2.7":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., Confederation, National Policy, Underground Railroad, resistance, residential school system, cultural genocide, reconciliation) and formats appropriate for specific audiences",
      // A3 — Understanding Historical Context: Events and Their Consequences
      "A3.1":
        "identify factors contributing to key events or developments in Canada between 1850 and 1890 (e.g., Confederation, the Red River Resistance, the creation of the NWMP, the North-West Resistance, the CPR), and explain their historical significance for different groups, including First Nations, Métis, and Inuit",
      "A3.2":
        "identify some key events across Canada between 1850 and 1890 that shaped the experiences of Black people in Canada and explain the impact on Black individuals and communities and on broader Canadian society",
      "A3.3":
        "describe key political and legal developments that affected First Nations, Métis, and Inuit people during this period, including treaties, government policies, and the Indian Act (e.g., Robinson Treaties 1850, Numbered Treaties 1–7, Manitoba Act 1870, Métis scrip system), and explain some of their short- and long-term consequences",
      "A3.4":
        "identify some key factors that contributed to the establishment of the residential school system (e.g., land appropriation, desire to impose Christianity, policies of assimilation, beliefs about European cultural superiority), and explain the impact of this system on Indigenous individuals and communities (e.g., loss of language and culture, intergenerational trauma, physical and emotional abuse)",
      "A3.5":
        "identify key political and legal changes that occurred in and/or affected Canada during this period (e.g., the U.S. Fugitive Slave Act 1850, the British North America Act, the National Policy), and explain the impact on various non-Indigenous individuals, groups, and/or communities",
      "A3.6":
        "identify key social and economic changes during this period (e.g., the Industrial Revolution, the gold rush in B.C., increasing immigration, declining buffalo populations affecting Plains First Nations and Métis), and explain the impact on various groups, including First Nations, Métis, and Inuit",
      "A3.7":
        "describe significant instances of cooperation and conflict in Canada during this period (e.g., the Red River Resistance, the North-West Resistance, the Toronto printers' strike of 1872, coordination of the Underground Railroad, Confederation negotiations)",
      "A3.8":
        "identify a variety of significant individuals and groups in Canada during this period (e.g., George Étienne Cartier, Gabriel Dumont, John A. Macdonald, Big Bear, Louis Riel, Mary Ann Shadd, Emily Stowe, Chinese railway workers), and explain their contributions to heritage and/or identities in Canada",
      // B1 — Application: Canada – Past and Present
      "B1.1":
        "analyse key similarities and differences in the experiences of various groups and communities, including First Nations, Métis, and Inuit, in present-day Canada and in Canada between 1890 and 1914 (e.g., the urban poor, workers, farmers, recent immigrants, African Canadians, Chinese Canadians, women, children)",
      "B1.2":
        "analyse some ways in which challenges affected First Nations, Métis, and Inuit individuals, families, and communities during this period, with specific reference to treaties, the Indian Act, the reserve system, and the residential school system, and how some of these challenges continue to affect Indigenous peoples today",
      "B1.3":
        "analyse some of the challenges facing various non-Indigenous individuals, groups, and/or communities in Canada between 1890 and 1914 (e.g., industrialization, restrictions on immigration, lack of political rights for women, racism), and compare them with challenges facing present-day Canadians",
      "B1.4":
        "analyse actions taken by various individuals, groups, and/or communities, including First Nations, Métis, and Inuit, in Canada between 1890 and 1914 to improve their lives, and compare these actions to those taken by similar groups today",
      // B2 — Inquiry: Perspectives on a Changing Society
      "B2.1":
        "formulate questions to guide investigations into perspectives of different groups on significant events affecting Canada between 1890 and 1914 (e.g., the Boer War, the Manitoba Schools Question, the expansion of the residential school system, Canadian immigration policy, women's suffrage)",
      "B2.2":
        "gather and organize information and evidence about perspectives of different groups on significant events, using a variety of primary and secondary sources (e.g., government documents, treaties, letters, newspaper editorials, Indigenous oral histories, photographs)",
      "B2.3":
        "assess the credibility of sources and information relevant to their investigations (e.g., by considering perspective, bias, accuracy, authenticity, purpose, and context)",
      "B2.4":
        "analyse and construct maps as part of their investigations into significant events in Canada during this period, with a focus on exploring spatial boundaries (e.g., the Klondike gold rush, growth of cities, growth of residential schools, origins and destinations of immigrants)",
      "B2.5":
        "interpret and analyse information and evidence relevant to their investigations, using a variety of tools (e.g., organizers to compare perspectives on reciprocity; analysis of political cartoons; graphs on quality of life indicators)",
      "B2.6":
        "evaluate evidence and draw conclusions about perspectives of different groups and communities, including First Nations, Métis, and/or Inuit, on significant events or issues affecting Canada during this period",
      "B2.7":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., Klondike, industrialization, unions, strikes, suffragist, reciprocity, alliance) and formats appropriate for specific audiences",
      // B3 — Understanding Historical Context: Events and Their Consequences
      "B3.1":
        "identify factors contributing to key issues, events, and/or developments that specifically affected First Nations, Métis, and Inuit in Canada between 1890 and 1914 (e.g., laws forbidding Indigenous ceremonies, expropriation of reserve lands, expansion of residential schools, Métis scrip), and explain their historical significance",
      "B3.2":
        "identify factors contributing to key issues, events, and/or developments that specifically affected Black individuals and communities in Canada between 1890 and 1914, and explain the historical significance for various Black individuals and/or communities across Canada",
      "B3.3":
        "identify factors contributing to key events and/or developments in Canada between 1890 and 1914 (e.g., the Boer War, increased immigration, the women's suffrage movement, founding of the Children's Aid Society, labour unions, anti-Asian riots in Vancouver), and explain their historical significance for various non-Indigenous groups",
      "B3.4":
        "identify key political and legal changes during this period (e.g., Alberta and Saskatchewan becoming provinces, the Manitoba Schools Question, the Truancy Act 1891, increases in the Chinese head tax, the Naval Service Bill), and explain the impact on various groups, including First Nations, Métis, and Inuit",
      "B3.5":
        "identify key social and economic changes during this period (e.g., the Klondike gold rush, the Immigration Act of 1910, technological changes, increasing urbanization, development of mining), and explain the impact on various groups, including First Nations, Métis, and Inuit",
      "B3.6":
        "describe significant examples of cooperation and conflict in Canada during this period (e.g., Indigenous resistance to residential schools, English–French conflicts over the Boer War, strikes by coal miners, cooperation under the social gospel movement, cooperation among immigrant communities)",
      "B3.7":
        "identify a variety of significant individuals and groups in Canada during this period (e.g., Henri Bourassa, Pauline Johnson, Wilfrid Laurier, Tom Longboat, Nellie McClung, Onondeyoh [Frederick Ogilvie Loft], Duncan Campbell Scott, Clifford Sifton), and explain their contributions to heritage and/or identities in Canada",
    },
  },
  Geography: {
    "7": {
      // A1 — Application: Interrelationships between People and the Physical Environment
      "A1.1":
        "describe various ways in which people have responded to challenges and opportunities presented by the physical environment (e.g., building dams, levees, or terraces; designing buildings suited to local climate or earthquakes; resource towns; tourism), and analyse short- and long-term effects of some of these responses (e.g., water pollution, habitat loss, deforestation, development of national parks)",
      "A1.2":
        "compare and contrast the perspectives of some different groups (e.g., Indigenous peoples, organic vs. large-scale farmers, resource-extraction companies, environmental organizations, land developers) on the challenges and opportunities presented by the natural environment",
      "A1.3":
        "assess the physical environment in various locations around the world to determine which environment or environments have the greatest impact on people (e.g., developing criteria for ranking challenges and opportunities presented by deserts, tropical rainforests, mountains, volcanic islands, cold climates, floodplains, and coastal regions)",
      "A1.4":
        "assess ways in which different peoples living in similar physical environments have responded to challenges and opportunities, and assess the sustainability of these responses (e.g., flood control in the Netherlands vs. the Mississippi delta; nomadic lifestyles in the Sahara vs. irrigation cities like Las Vegas; ecotourism in Costa Rican rainforests vs. clear-cutting in the Amazon)",
      // A2 — Inquiry: Investigating Physical Features and Processes
      "A2.1":
        "formulate questions to guide investigations into the impact of natural events and/or human activities that change the physical environment (e.g., earthquakes, volcanic eruptions, drought, floods, hurricanes, industrial pollution, agricultural practices, land-reclamation projects, transportation systems), ensuring questions reflect a geographic perspective",
      "A2.2":
        "gather and organize data and information from a variety of sources and technologies on the impact of natural events and/or human activities that change the physical environment, ensuring sources reflect more than one perspective",
      "A2.3":
        "analyse and construct maps as part of their investigations, with a focus on investigating the spatial boundaries of impact (e.g., maps of river pollution, soil erosion and habitat loss, areas affected by rising sea levels)",
      "A2.4":
        "interpret and analyse data and information relevant to their investigations, using various tools and spatial technologies (e.g., photographs and thematic maps, graphs and charts, GIS for population shifts from rising sea levels)",
      "A2.5":
        "evaluate evidence and draw conclusions about the impact of natural events and/or human activities that change the physical environment",
      "A2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., climate, land use, landforms, vegetation, drought, flood, climate change, agriculture, ecotourism, land reclamation) and formats appropriate for specific audiences",
      // A3 — Understanding Geographic Context: Patterns in the Physical Environment
      "A3.1": "identify the location and describe the physical characteristics of various landforms (e.g., mountains, plateaus, plains, valleys)",
      "A3.2":
        "describe some key natural processes and human activities (e.g., tectonic forces, weathering and erosion, deposition, glaciation, mining, land-reclamation projects) that create and change landforms",
      "A3.3":
        "demonstrate the ability to extract information from and analyse topographical maps (e.g., construct a cross-section of a landform based on a topographical map)",
      "A3.4":
        "describe patterns and physical characteristics of some major water bodies and systems around the world (e.g., river systems, drainage basins, lakes, oceans)",
      "A3.5":
        "describe some key natural processes and human activities (e.g., changes in rainfall, glacial melt, erosion, rising sea levels, climate change, constructing dams, irrigation, bottling water from aquifers) that create and change water bodies and systems",
      "A3.6": "describe patterns and characteristics of major climate regions around the world (e.g., tropical, dry, temperate, continental, and polar climate regions)",
      "A3.7":
        "describe some key natural processes and other factors, including human activities (e.g., ocean currents, wind systems, latitude, elevation, bodies of water, landforms, deforestation, greenhouse gas emissions) that create and change climate patterns",
      "A3.8": "analyse and construct climate graphs to gather information on and illustrate climate patterns for a specific location",
      "A3.9": "describe patterns and characteristics of major natural vegetation regions around the world (e.g., grasslands, boreal forests, tropical rain forests, tundra)",
      "A3.10":
        "describe some key natural processes and human activities (e.g., climate change, soil erosion, deforestation, use of chemical fertilizers, monoculture, grazing, introduction of invasive species) that create and change natural vegetation patterns",
      "A3.11":
        "describe how different aspects of the physical environment interact with each other in two or more regions of the world (e.g., interrelationships between vegetation, landforms, and climate in desert or volcanic regions)",
      // B1 — Application: Natural Resources and Sustainability
      "B1.1":
        "analyse interrelationships between the location/accessibility, mode of extraction/harvesting, and use of various natural resources (e.g., mining techniques and deposit type/location; types of electrical power generation across Europe; methods of harvesting trees)",
      "B1.2":
        "analyse natural resource extraction/harvesting and use in some specific regions of the world (e.g., forestry in the Amazon or Sweden; international trawlers fishing off West Africa; coal-fired electricity in China), including the sustainability of these practices",
      "B1.3":
        "assess the efforts of some groups, agencies, and/or organizations (e.g., UN Environment Programme, NGOs such as Friends of the Earth or Rainforest Alliance, Indigenous groups, national governments) in helping to preserve natural resources",
      "B1.4":
        "create a personal plan of action outlining how they can contribute to more sustainable natural resource extraction/harvesting and/or use (e.g., using FSC-certified wood, reducing energy use at home or school, reducing personal consumption of consumer goods)",
      // B2 — Inquiry: Investigating Issues Related to Natural Resources
      "B2.1":
        "formulate questions to guide investigations into issues related to the impact of natural resource extraction/harvesting and/or use around the world from a geographic perspective (e.g., overfishing, deforestation and reforestation, resource extraction in Indigenous territories, alternative energy, fossil fuels)",
      "B2.2":
        "gather and organize data and information from a variety of sources on the impact of resource extraction/harvesting and/or use, ensuring sources reflect more than one perspective (e.g., satellite imagery, news stories, NGO reports, Indigenous community perspectives, corporate employment data)",
      "B2.3":
        "analyse and construct maps as part of their investigations, with a focus on the spatial boundaries of and patterns relating to their topics (e.g., GIS layers on air pollution, thematic maps on clear-cutting and reforestation, annotated maps of resource industry impact on local ecosystems)",
      "B2.4":
        "interpret and analyse data and information relevant to their investigations, using various tools and spatial technologies (e.g., graphs on declining fish stocks, photographs of mining impacts, computer-based geographic tools on changes to water systems from irrigation)",
      "B2.5":
        "evaluate evidence and draw conclusions about issues related to the impact of natural resource extraction/harvesting and/or use around the world",
      "B2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., non-renewable, renewable, flow resources, extraction, sustainability, deforestation, fossil fuels, aquifer) and formats appropriate for specific audiences",
      // B3 — Understanding Geographic Context: Using Natural Resources
      "B3.1":
        "identify Earth's renewable, non-renewable, and flow resources (e.g., renewable: trees, fish, soil; non-renewable: fossil fuels, metallic minerals; flow: solar, wind, tides, running water), and explain their relationship to Earth's physical features",
      "B3.2":
        "describe ways in which people use the natural environment, including specific elements within it, to meet their needs and wants (e.g., quarrying rock for building materials, using trees for lumber and pulp, using fossil fuels for energy, using water for drinking and irrigation, using animals for food and clothing)",
      "B3.3":
        "identify significant short- and long-term effects of natural resource extraction/harvesting and use on people and the environment (e.g., deforestation, desertification, smog, acid rain, climate change, soil contamination, habitat destruction, flooding)",
      "B3.4":
        "describe the perspectives of different groups (e.g., a traditional Indigenous community, an environmental organization, a multinational mining or forestry company, residents of a resource town) regarding the use of the natural environment to meet human needs",
      "B3.5":
        "describe some responses to social and/or environmental challenges arising from the use of natural resources (e.g., increased use of wind/solar/tidal energy, reduced consumption, fair trade promotion, boycotting unsustainable products or companies)",
      "B3.6":
        "demonstrate the ability to extract information from, analyse, and construct GIS maps relating to natural resources around the world (e.g., location of oil refineries relative to population centres and agricultural land; areas of deforestation and current land use)",
    },
    "8": {
      // A1 — Application: Interrelationships between Settlement and the Environment
      "A1.1":
        "analyse some of the ways in which the physical environment (e.g., climate, landforms, soil type, vegetation, natural resources) has influenced settlement patterns in different countries and/or regions around the world (e.g., climate and natural resources in Brazil, landforms in Japan, soil types in Egypt)",
      "A1.2":
        "analyse how processes related to the physical environment may affect human settlements in the future (e.g., the impact of rising sea levels on coastal cities, desertification, earthquakes in populous regions, increasingly violent tropical storms from climate change)",
      "A1.3":
        "describe possible features of a sustainable community in the future (e.g., energy-efficient buildings, renewable energy, public transit, community gardens, waste and water recycling), and analyse some challenges associated with creating such a community (e.g., cost, population growth, urbanization, continued dependence on fossil fuels)",
      // A2 — Inquiry: Human Settlements and Sustainability
      "A2.1":
        "formulate questions to guide investigations into issues related to the interrelationship between human settlement and sustainability from a geographic perspective (e.g., land-reclamation projects in the Netherlands or Japan; land-use conflicts in Brazil, Mexico, or Kenya; the global trend towards increased urbanization)",
      "A2.2":
        "gather and organize data and information from a variety of sources and technologies to investigate issues related to the interrelationship between human settlement and sustainability (e.g., aerial photographs, government and international data, documentaries, environmental advocacy websites)",
      "A2.3":
        "analyse and construct various print and digital maps as part of their investigations, with a focus on investigating the spatial boundaries of the issue (e.g., GIS maps of population density change, land-use maps, thematic maps on loss of green space)",
      "A2.4":
        "interpret and analyse data and information relevant to their investigations, using various tools and spatial technologies (e.g., photographs of land-use conflicts, graphic organizers for multiple perspectives, online geographic software for population shifts)",
      "A2.5": "evaluate evidence and draw conclusions about issues related to the interrelationship between human settlement and sustainability",
      "A2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., settlement patterns, population distribution, population density, land use, sustainable development, land reclamation, migration) and formats appropriate for specific audiences",
      // A3 — Understanding Geographic Context: Settlement Patterns and Trends
      "A3.1":
        "identify significant spatial patterns in human settlement on a global scale (e.g., linear, scattered, and clustered patterns; global patterns in population density and/or distribution)",
      "A3.2":
        "identify and describe some ways in which the physical environment can influence the general location and patterns of human settlements (e.g., climate, soil, and topography on agricultural settlements; physical features on urban development; water for transportation and industry; natural resources and resource towns)",
      "A3.3":
        "identify significant land-use issues (e.g., competition for land for agriculture, industry, housing, recreation, and wilderness; land claims by Indigenous groups; development in ecologically sensitive areas), and describe responses of various groups to these issues",
      "A3.4":
        "identify and describe significant current trends in human settlement (e.g., increased migration from rural to urban areas; people moving from major cities to smaller towns; loss of natural habitat; urban sprawl; land reclamation)",
      "A3.5":
        "describe various ways in which human settlement has affected the environment (e.g., water and air pollution, soil contamination, deforestation, loss of agricultural land to urban sprawl, light pollution, disruption of migratory routes, desertification)",
      "A3.6":
        "describe some practices that individuals and communities have adopted to help make human settlements more sustainable (e.g., reducing water use, recycling and composting, limiting construction on agricultural land, using public transit, planting trees)",
      "A3.7":
        "demonstrate the ability to analyse and construct choropleth maps on topics related to human settlement (e.g., population density, availability or use of agricultural land, spending on transportation)",
      // B1 — Application: Global Inequalities in Quality of Life
      "B1.1":
        "analyse some interrelationships among factors that can contribute to quality of life (e.g., lack of access to clean water leads to water-borne diseases and high death rates; equal access to education leads to higher literacy rates, better employment rates, and improved maternal health)",
      "B1.2":
        "analyse how various factors have affected the economies of specific developed and developing countries (e.g., foreign ownership of natural resources in Nigeria, colonial legacy in South Africa, debt load in Honduras, government expenditures in France or Mali), and explain the interrelationship between these factors and quality of life",
      "B1.3":
        "assess the effectiveness of various programs and policies aimed at improving quality of life in various countries (e.g., programs to provide clean water, improve literacy, provide HIV/AIDS drugs, reduce malaria, reduce child labour, or promote fair trade)",
      "B1.4":
        "assess the effectiveness of media in improving the quality of life in some countries/regions (e.g., television advertisements for aid organizations, celebrity spokespeople, journalistic coverage of disasters, fundraisers such as Live Aid)",
      // B2 — Inquiry: Development and Quality of Life Issues
      "B2.1":
        "formulate questions to guide investigations into issues related to global development and quality of life from a geographic perspective (e.g., the impact of educating girls or the AIDS pandemic in sub-Saharan Africa; fair trade implications; foreign ownership of natural resources; the impact of foreign debt)",
      "B2.2":
        "gather and organize data and information from a variety of sources and technologies to investigate issues related to global development and quality of life (e.g., UN demographic data, demographic maps, national government data on poverty and education, images showing housing conditions, corporate websites)",
      "B2.3":
        "analyse and construct digital and print maps as part of their investigations into issues related to global development and quality of life (e.g., issue-based maps showing HDI rankings, GIS maps correlating life expectancy and literacy rates, flow maps showing trade patterns, annotated maps of foreign land ownership)",
      "B2.4":
        "interpret and analyse data and information relevant to their investigations, using various tools and spatial technologies (e.g., bar graphs on per capita GDP and literacy rates, GIS for population shifts, images showing quality of life differences, graphic organizers for multiple perspectives)",
      "B2.5": "evaluate evidence and draw conclusions about issues related to global development and quality of life",
      "B2.6":
        "communicate the results of their inquiries using appropriate vocabulary (e.g., demography, per capita, quality of life, developed/developing countries, GDP, literacy rate, correlation, exploitation, fair trade) and formats appropriate for specific audiences",
      // B3 — Understanding Geographic Context: Global Economic Development and Quality of Life
      "B3.1":
        "identify and describe the significance of several indicators commonly used to measure quality of life on a global scale (e.g., infant mortality, fertility rate, life expectancy, birth rate, death rate, access to medical care and clean water, literacy rate, poverty rate, per capita income, GDP, unemployment rates, national debt)",
      "B3.2":
        "compare findings with respect to selected quality of life indicators in some developing and more developed countries (e.g., infant and maternal mortality rates, literacy rates for men and women, and per capita GDP in Australia, Mali, and Bangladesh)",
      "B3.3":
        "demonstrate the ability to analyse and construct scatter graphs, both on paper and using a graphing program, when studying global development and/or quality of life (e.g., scatter graphs illustrating the correlation between literacy rates and life expectancy, or between infant mortality and access to clean water)",
      "B3.4":
        "demonstrate the ability to analyse and construct population pyramids, both on paper and using a graphing program, when studying demographic patterns and trends in developed and developing countries (e.g., comparing life expectancy of men and women; predicting future population trends for a country)",
      "B3.5":
        "identify various groups and organizations that work to improve quality of life (e.g., Free the Children, International Planned Parenthood Federation, Médecins sans Frontières, Right to Play, Water for People), and describe their focus",
      "B3.6": "identify different types of economic systems (e.g., traditional, command, market, mixed), and describe their characteristics",
      "B3.7":
        "explain how the four main economic sectors (i.e., primary, secondary, tertiary, and quaternary) are related to global development (e.g., countries dependent on the primary sector tend to rank lower on the HDI than those with more balanced or tertiary/quaternary-dominated economies)",
      "B3.8":
        "identify and describe various factors that can contribute to economic development (e.g., access to natural resources, patterns of trade, colonial legacy, corruption, government expenditures, debt load, foreign ownership of resources, war or political instability)",
      "B3.9":
        "describe the spatial distribution of wealth, both globally and within selected countries/regions (e.g., concentration of wealth in North America, Europe, and parts of the Middle East; emerging economies such as Russia, China, and India; patterns of rural poverty and urban wealth)",
    },
  },
}

export function describeCode(subject: string, code: string, grade?: string): string | undefined {
  return gradeLookup(SPECIFIC_DESCRIPTIONS[normalizeSubject(subject)], grade, code)
}

// Codes we have rich specific descriptions for, by subject (and grade, for
// grade-aware subjects). Used by the dev-seed generator to produce realistic
// demo data. Grade-agnostic subjects ignore the grade argument.
export function describedCodes(subject: string, grade?: string): string[] {
  const canonical = normalizeSubject(subject)
  const table = SPECIFIC_DESCRIPTIONS[canonical]
  if (!table) return []
  const bucket = (grade && table[grade]) ?? table[GRADE_AGNOSTIC]
  return Object.keys(bucket ?? {})
}
