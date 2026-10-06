import {expect,it} from 'vitest';
import {likelyCoveredSkills} from './curriculum-coverage';
it('marks probable CBSE Grade 11 topics without removing or completing lessons',()=>{
  const coverage=likelyCoveredSkills({curriculum:'cbse',grade:11,subjects:['Mathematics'],topicsStudied:[]});
  expect(coverage.has('m-adv-nonlin-func')).toBe(true);
  expect(coverage.has('rw-ii-central')).toBe(false);
  expect(likelyCoveredSkills({curriculum:'cbse',grade:11,subjects:['English'],topicsStudied:[]}).size).toBe(0);
});
