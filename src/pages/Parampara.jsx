import React from "react";
import PageHeader from "../components/PageHeader";
import ParamparaLineage from "../components/ParamparaLineage";

export default function Parampara() {
  return (
    <>
      <PageHeader
        title="Parampara"
        subtitle="Over two hundred years of spiritual succession."
        current="Parampara"
      />
      <ParamparaLineage />
    </>
  );
}
