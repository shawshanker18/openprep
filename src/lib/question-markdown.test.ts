import {expect,it} from 'vitest';
import {normalizeQuestionMarkdown as clean} from './question-markdown';
it('preserves math commands while repairing inline align environments and row breaks',()=>{
  expect(clean('$\\begin{align}x&=2\\ y&=3\\end{align}$')).toBe('$\\begin{aligned}x&=2\\\\ y&=3\\end{aligned}$');
  expect(clean('$\\frac{1}{2}+\\theta$')).toBe('$\\frac{1}{2}+\\theta$');
});
it('renders currency as text and removes an imported link to the original calculator site',()=>{
  expect(clean('Cost: $\\$236,000$.')).toBe('Cost: \\$236,000.');
  expect(clean('Question\n[Show calculator](/r/dsat_desmos_calculator)')).toBe('Question');
});
it('separates adjacent inline math spans without changing display math',()=>{
  expect(clean('$\\text{height}$$t$')).toBe('$\\text{height}$ $t$');
  expect(clean('$$x=2$$')).toBe('$$x=2$$');
});
