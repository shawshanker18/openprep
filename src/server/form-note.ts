export const note = (problems: { message: string }[]) => encodeURIComponent(problems.map((p) => p.message).join(" · ").slice(0, 400));
