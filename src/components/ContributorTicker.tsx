"use client";

import Link from "next/link";

const cities = [
  { name: "HANOI", coord: "10.76°N" },
  { name: "BERLIN", coord: "52.52°N" },
  { name: "TOKYO", coord: "35.68°N" },
  { name: "NEW YORK", coord: "40.71°N" },
  { name: "SAIGON", coord: "10.82°N" },
  { name: "LONDON", coord: "51.51°N" },
  { name: "SINGAPORE", coord: "1.35°N" },
  { name: "SEOUL", coord: "37.56°N" },
  { name: "PARIS", coord: "48.86°N" },
  { name: "LISBON", coord: "38.72°N" },
  { name: "MEXICO CITY", coord: "19.43°N" },
];

const users = [
  { username: "laihenyi", tokens: "2.4M" },
  { username: "aresdgi", tokens: "1.8M" },
  { username: "joeylee", tokens: "980K" },
  { username: "minhph", tokens: "740K" },
  { username: "pftom", tokens: "620K" },
  { username: "nguyenvy", tokens: "540K" },
  { username: "sariah", tokens: "410K" },
  { username: "danielo", tokens: "360K" },
  { username: "maya.k", tokens: "290K" },
];

export default function ContributorTicker() {
  return (
    <section className="bg-background">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex items-stretch border-y border-black/10 overflow-hidden">
          {/* Left label */}
          <div className="flex-shrink-0 pr-4 md:pr-6 py-4 border-r border-black/10">
            <div className="text-xs font-medium tracking-wider">FROM THE FIELD</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 bg-accent rounded-full" />
              <span className="text-[10px] text-muted tracking-wider">LIVE · 23 CITIES · 11 USERS</span>
            </div>
          </div>

          {/* Scrolling rows */}
          <div className="flex-1 overflow-hidden py-2.5 ticker-fade flex flex-col gap-2 justify-center">
            {/* Row 1: cities */}
            <div className="flex animate-marquee whitespace-nowrap">
              {[...cities, ...cities].map((city, index) => (
                <div key={`city-${index}`} className="flex items-center mx-5 font-mono text-[13px] font-medium tracking-wider">
                  <span className="text-muted font-normal mr-2">{city.coord}</span>
                  <span>{city.name}</span>
                </div>
              ))}
            </div>
            {/* Row 2: users */}
            <div className="flex animate-marquee-reverse whitespace-nowrap">
              {[...users, { username: "you", tokens: "be next" }, ...users, { username: "you", tokens: "be next" }].map(
                (user, index) => (
                  <div
                    key={`user-${index}`}
                    className="flex items-center mx-5 font-mono text-[13px] tracking-wider"
                  >
                    <Link
                      href={`https://github.com/${user.username}`}
                      className="text-accent font-medium mr-2 hover:underline"
                    >
                      @{user.username}
                    </Link>
                    <span className="font-medium">
                      {user.tokens === "be next" ? "be next" : `${user.tokens} tokens`}
                    </span>
                    <span className="text-muted text-[11px] ml-2 tracking-widest uppercase">this week</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
