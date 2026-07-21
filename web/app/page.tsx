import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { manifest } from "@/content/manifest";
import { BlockCard } from "@/components/block-card";
import { Button } from "@/components/ui/button";

const upcoming = [
  { title: "Messenger", contribution: "Асинхронная отправка уведомлений при создании книги" },
  { title: "Кэширование", contribution: "Кэш списка книг, HTTP-заголовки кэширования" },
  { title: "Деплой в продакшн", contribution: "Продакшн-чеклист" },
  { title: "Senior: подготовка к собеседованию", contribution: "Архитектура, code review, system design — на примере BookShelf" },
];

export default function Home() {
  const firstLesson = manifest[0]?.lessons[0];

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <p className="text-sm font-medium text-accent">Интерактивный курс</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
        Symfony: с нуля до руководящей позиции
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Теория по официальной документации, практические задания с выполнением PHP-кода в
        реальном времени в песочнице (в том числе внутри настоящего Symfony-приложения), тесты на
        понимание теории и один сквозной проект — <strong className="text-foreground">BookShelf</strong>,
        каталог книг, который растёт вместе с курсом от простого JSON API до полноценного
        приложения. Цель курса — уверенно пройти собеседование на lead/руководящую роль в Symfony.
      </p>

      {firstLesson && (
        <div className="mt-6">
          <Link href={`/blocks/${manifest[0].slug}/${firstLesson.slug}`}>
            <Button size="md">
              Начать с первого урока
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-14">
        <h2 className="mb-4 text-xl font-semibold">Блоки курса</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {manifest.map((block, index) => (
            <BlockCard key={block.slug} block={block} index={index} />
          ))}
        </div>
      </div>

      <div className="mt-14">
        <h2 className="mb-1 text-xl font-semibold">Капстоун-проект: BookShelf</h2>
        <p className="mb-4 text-sm text-muted">
          Мини-проекты курса — это не разрозненные упражнения, а один и тот же сервис, который от
          блока к блоку обрастает новыми возможностями. Курс наполняется постепенно, блок за
          блоком, но маршрут до финала продуман заранее:
        </p>
        <ol className="space-y-2">
          {upcoming.map((item, index) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-lg border border-dashed border-border px-3.5 py-2.5 text-sm"
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-muted">
                {manifest.length + index + 1}
              </span>
              <span>
                <span className="font-medium">{item.title}</span>
                <span className="text-muted"> — {item.contribution}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
