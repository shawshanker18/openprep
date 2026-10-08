import {boardTopics,TOPICS} from '@/content/taxonomy';
import {completedChapters,skillsFromChapters} from '@/content/cbse-chapters';
/**
 * SAT skills a student has probably met in school. Informational only: curriculum never completes or removes a lesson.
 * 1. CBSE students: the chapters they ticked plus every chapter of the classes below theirs (Class 11 has done 9 and 10),
 *    mapped to SAT skills. Their own answers beat a guess.
 * 2. Otherwise: topics they ticked plus a coarse guess from board and grade (and only if they study Mathematics).
 */
export function likelyCoveredSkills(profile:{curriculum:string|null;grade:number|null;topicsStudied:string[];chaptersDone?:string[];subjects?:string[]}) {
  const studiesMaths=!(profile.subjects?.length && !profile.subjects.includes('Mathematics'));
  const tickedChapters=profile.chaptersDone??[];
  // Earlier classes are assumed only for students who do maths; chapters they ticked themselves always count.
  const fromChapters=skillsFromChapters(profile.curriculum==='cbse'?(studiesMaths?completedChapters(tickedChapters,profile.grade):tickedChapters):[]);
  const ticked=new Set(TOPICS.filter(t=>profile.topicsStudied.includes(t.id)).flatMap(t=>t.skills));
  if(fromChapters.size>0) return new Set([...fromChapters,...ticked]);
  const curriculumTopics=profile.subjects?.length && !profile.subjects.includes('Mathematics') ? [] : boardTopics(profile.curriculum,profile.grade);
  const guessed=new Set(TOPICS.filter(t=>curriculumTopics.includes(t.id)).flatMap(t=>t.skills));
  return new Set([...guessed,...ticked]);
}
