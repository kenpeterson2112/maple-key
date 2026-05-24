export const CURRICULUM_DESCRIPTIONS: { [key: string]: string } = {
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
}

// Overall expectations group the specific expectations above (D1.x → D1, etc.).
export const OVERALL_EXPECTATIONS: { [key: string]: string } = {
  D1: "Data Literacy",
  D2: "Probability",
  F1: "Financial Literacy",
}

export function overallCodeOf(code: string): string {
  return code.split(".")[0]
}

export function overallLabel(overall: string): string {
  return OVERALL_EXPECTATIONS[overall] ?? overall
}

export function groupByOverall(codes: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const code of codes) {
    ;(out[overallCodeOf(code)] ??= []).push(code)
  }
  return out
}
