-- granularity: how focused a resource is, from one activity up to a whole-site
-- collection (vocabulary and definitions in schema/resource-schema.json). Its
-- CHECK constraint comes with the regenerated *_resource_constraints.sql that
-- follows this file, whose column assertion needs the column to exist first.
--
-- Apply this before any resources.json record carries the field:
-- import_resources() refuses fields that have no column.
alter table public.resources add column granularity text;

-- Appended last, which is the only change create or replace view allows.
create or replace view public.published_resources
with (security_invoker = true)
as
select
  seq, id, topic_title, description, url, publisher_creator, grade_level, grade_band,
  subject, strand, curriculum_expectations, province, jurisdiction, modality,
  resource_type, access_type, is_paid, accessibility, metadata, language,
  year_published, instructional_modes, usage_notes, pedagogical_function,
  estimated_minutes, is_collection, suppressed, decomposed, tags, granularity
from public.resources
where status = 'live';
