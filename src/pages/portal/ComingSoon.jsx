import React from "react";
import { Link } from "react-router-dom";
import { Card } from "../../portal/ui";

export default function ComingSoon({ title = "This section" }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <h1 className="mb-2 font-display text-2xl text-maroon">{title}</h1>
        <p className="text-textSoft">
          This part of the portal is being built and will be available soon.
        </p>
        <Link to="/portal" className="mt-5 inline-block font-semibold text-maroon hover:underline">
          ← Back to dashboard
        </Link>
      </Card>
    </div>
  );
}
