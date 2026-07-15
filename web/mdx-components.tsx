import type { MDXComponents } from "mdx/types";
import { CodeExercise } from "@/components/code-exercise";
import { Quiz } from "@/components/quiz";

const components: MDXComponents = {
  CodeExercise: CodeExercise as MDXComponents[string],
  Quiz: Quiz as MDXComponents[string],
};

export function useMDXComponents(): MDXComponents {
  return components;
}
