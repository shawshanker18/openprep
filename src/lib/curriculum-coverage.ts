import {boardTopics,TOPICS} from '@/content/taxonomy';
/** Informational markers only. Curriculum never completes or removes a lesson. */
export function likelyCoveredSkills(profile:{curriculum:string|null;grade:number|null;topicsStudied:string[];subjects?:string[]}) {
  const curriculumTopics=profile.subjects?.length && !profile.subjects.includes('Mathematics') ? [] : boardTopics(profile.curriculum,profile.grade);
  const topics=new Set([...curriculumTopics,...profile.topicsStudied]);
  return new Set(TOPICS.filter(t=>topics.has(t.id)).flatMap(t=>t.skills));
}
