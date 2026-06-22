"use client";

import { useEffect, useState } from "react";

export default function UKClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleString("en-GB", {
          timeZone: "Europe/London",
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full bg-success animate-pulse" />
      <span>UK &mdash; {time}</span>
    </div>
  );
}
