import React from "react";
import HeroBanner from "../components/HeroBanner";
import AboutSection from "../components/AboutSection";
import Banner from "../components/Banner";
import DifferenceSection from "../components/DifferenceSection";
import ValuesSection from "../components/ValuesSection";
import Stats from "../components/Stats";
import Quotes from "../components/Quotes";

export default function Home() {
  return (
    <>
      <HeroBanner />
      <AboutSection />
      <Banner />
      <DifferenceSection />
      <ValuesSection />
      <Stats />
      <Quotes />
    </>
  );
}
