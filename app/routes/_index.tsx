import type { V2_MetaFunction } from "@vercel/remix";

import { Link } from '@remix-run/react'

export const meta: V2_MetaFunction = () => [{ title: "New Remix App" }];

export default function Index() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <nav>
        <Link to="/peter-lougheed-provincial-park-elkwood">Elkwood</Link>
        <Link to="/banff-national-park-two-jack-lakeside">Two Jack Lakeside</Link>
      </nav>
    </div>
  );
}
