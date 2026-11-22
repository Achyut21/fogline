import Image from "next/image";
import { legal, map } from "@/copy";
import type { SheetCard } from "@/server/station-sheet";

const s = map.sheet;

/** A station's stop card (F3.3): one fact from a nearby Wikipedia article and its photo. */
export function StopCard({
  card,
  headingId = "stop-card",
}: {
  card: SheetCard;
  headingId?: string;
}) {
  if (!card.story) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-lg font-extrabold tracking-tight">
        {s.card}
      </h3>
      <figure className="flex flex-col gap-2 overflow-hidden rounded-lg bg-surface-sunken">
        {card.image && (
          <div className="relative aspect-video w-full">
            <Image
              src={card.image.url}
              alt={card.story.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        <figcaption className="flex flex-col gap-1 px-3 pb-3">
          <p>{card.story.fact}</p>
          <a href={card.story.url} className="text-sm text-ink-muted underline">
            {s.source(card.story.title)}
          </a>
          {card.image && (
            <a href={card.image.page} className="text-xs text-ink-muted underline">
              {legal.photo(card.image.author, card.image.license)}
            </a>
          )}
        </figcaption>
      </figure>
    </section>
  );
}
