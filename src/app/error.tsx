"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="schedule-empty"><span className="conflict-mark">!</span><p className="eyebrow ochre-text">WORKSPACE ERROR</p><h1>The planning view couldn’t load.</h1><p>Your session has not been submitted anywhere. Try rendering this route again.</p><button className="button primary elevated" type="button" onClick={retry}>Try again</button></main>;
}
