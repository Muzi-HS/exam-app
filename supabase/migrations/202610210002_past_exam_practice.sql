-- Keep existing math/concept sessions and allow past exam practice items.
begin;
alter table public.study_session_items
  drop constraint if exists study_session_items_item_type_check;
alter table public.study_session_items
  add constraint study_session_items_item_type_check
  check (item_type in ('math_problem', 'concept_question', 'past_exam_problem'));
commit;
