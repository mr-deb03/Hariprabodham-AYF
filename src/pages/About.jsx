import React from "react";
import PageHeader from "../components/PageHeader";
import AboutUs from "../components/AboutUs";
import Activities from "../components/Activities";

export default function About() {
  return (
    <>
      <PageHeader
        title="About Us"
        subtitle="Created through the vision and blessings of Guruhari Hariprasad Swamiji Maharaj."
        current="About"
      />
      <AboutUs />
      <Activities />
    </>
  );
}
