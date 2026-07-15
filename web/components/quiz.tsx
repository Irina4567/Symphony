"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { useProgress } from "@/lib/progress";
import { getQuiz } from "@/content/quizzes";
import { cn } from "@/lib/utils";
import type { QuizQuestion } from "@/content/types";

type Answer = number[];

function isCorrect(question: QuizQuestion, answer: Answer | undefined): boolean {
  if (!answer || answer.length === 0) return false;
  if (question.type === "single") {
    return answer.length === 1 && answer[0] === question.correctIndex;
  }
  const correct = [...question.correctIndexes].sort();
  const given = [...answer].sort();
  return correct.length === given.length && correct.every((v, i) => v === given[i]);
}

export function Quiz({ quizId }: { quizId: string }) {
  const quiz = getQuiz(quizId);
  const { setQuizResult, getQuizResult } = useProgress();

  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!quiz) {
    return (
      <div className="not-prose my-8 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        Тест «{quizId}» не найден.
      </div>
    );
  }

  function toggleAnswer(question: QuizQuestion, optionIndex: number) {
    if (submitted) return;
    setAnswers((prev) => {
      const current = prev[question.id] ?? [];
      if (question.type === "single") {
        return { ...prev, [question.id]: [optionIndex] };
      }
      const next = current.includes(optionIndex)
        ? current.filter((i) => i !== optionIndex)
        : [...current, optionIndex];
      return { ...prev, [question.id]: next };
    });
  }

  function handleSubmit() {
    const correctCount = quiz!.questions.filter((q) => isCorrect(q, answers[q.id])).length;
    setQuizResult(quiz!.id, correctCount, quiz!.questions.length);
    setSubmitted(true);
  }

  function handleRetry() {
    setAnswers({});
    setSubmitted(false);
  }

  const allAnswered = quiz.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);
  const score = submitted
    ? quiz.questions.filter((q) => isCorrect(q, answers[q.id])).length
    : null;
  const previousResult = getQuizResult(quiz.id);

  return (
    <div className="not-prose my-8 rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{quiz.title}</h3>
        {!submitted && previousResult && (
          <span className="text-xs text-muted">
            Прошлый результат: {previousResult.correct}/{previousResult.total}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {quiz.questions.map((question, qIndex) => {
          const selected = answers[question.id] ?? [];
          const correct = submitted && isCorrect(question, selected);
          return (
            <div key={question.id}>
              <p className="mb-2 text-sm font-medium">
                {qIndex + 1}. {question.question}
              </p>
              <div className="space-y-1.5">
                {question.options.map((option, optionIndex) => {
                  const isSelected = selected.includes(optionIndex);
                  const isRightAnswer =
                    question.type === "single"
                      ? question.correctIndex === optionIndex
                      : question.correctIndexes.includes(optionIndex);

                  return (
                    <label
                      key={optionIndex}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                        submitted
                          ? cn(
                              "cursor-default",
                              isRightAnswer
                                ? "border-success/50 bg-success/10"
                                : isSelected
                                  ? "border-danger/50 bg-danger/10"
                                  : "border-border"
                            )
                          : cn(
                              "cursor-pointer",
                              isSelected
                                ? "border-accent bg-accent/10"
                                : "border-border hover:bg-surface-muted"
                            )
                      )}
                    >
                      <input
                        type={question.type === "single" ? "radio" : "checkbox"}
                        name={question.id}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() => toggleAnswer(question, optionIndex)}
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
              {submitted && (
                <p
                  className={cn(
                    "mt-2 flex items-start gap-1.5 text-xs",
                    correct ? "text-success" : "text-danger"
                  )}
                >
                  {correct ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                  )}
                  {question.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
        {!submitted ? (
          <Button size="sm" onClick={handleSubmit} disabled={!allAnswered}>
            Проверить ответы
          </Button>
        ) : (
          <>
            <span
              className={cn(
                "text-sm font-medium",
                score === quiz.questions.length ? "text-success" : "text-foreground"
              )}
            >
              Результат: {score}/{quiz.questions.length}
            </span>
            <Button size="sm" variant="secondary" onClick={handleRetry}>
              <RotateCcw size={14} />
              Пройти заново
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
