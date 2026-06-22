import React from "react";
import PageHeader from "../components/PageHeader";
import Events from "../components/Events";
import EventMedia from "../components/EventMedia";

export default function EventsPage() {
  return (
    <>
      <PageHeader
        title="Events"
        subtitle="Join us for our upcoming gatherings, festivals and seva activities."
        current="Events"
      />
      <Events />
      <EventMedia />
    </>
  );
}
