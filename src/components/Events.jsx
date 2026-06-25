import React from "react";
import Reveal from "./Reveal";
import Tilt from "./Tilt";

// TODO: swap these placeholder images for real event photos.
import img1 from "../assets/home/diff-1.webp";
import img2 from "../assets/home/diff-2.webp";
import img3 from "../assets/home/diff-3.webp";
import img4 from "../assets/about/about_1.webp";
import img5 from "../assets/home/about-photo.webp";
import img6 from "../assets/home/forest.jpeg";

const events = [
  { title: "Career Workshop", date: "7th July", image: img1 },
  { title: "Guruhari Pragatya Parva", date: "17th August", image: img2 },
  { title: "Annakut Mahotsav", date: "23rd November", image: img3 },
  { title: "Blood Donation", date: "17th January", image: img4 },
  { title: "Youth Convention", date: "4th November", image: img5 },
  { title: "Summer Picnic", date: "25th December", image: img6 },
];

const Events = () => {
  return (
    <section id="events" className="bg-softGray py-20 px-6 md:px-20">

      <Reveal as="h2" className="text-3xl md:text-4xl font-medium text-primaryBrown mb-16 text-center">
        Upcoming Events & Activities
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {events.map((event, index) => (
          <Reveal key={event.title} variant="flip" delay={index * 100} className="group h-full">
            <Tilt className="h-full overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl">
              <div className="relative h-52 overflow-hidden">
                <img
                  src={event.image}
                  alt={event.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-4 left-4 rounded-full bg-primaryBrown px-3 py-1 text-xs font-medium text-white shadow">
                  {event.date}
                </span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-medium text-primaryBrown tracking-wide">
                  {event.title}
                </h3>
              </div>
            </Tilt>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default Events;
