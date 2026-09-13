import poster from "../assets/upcoming/ganesh-utsav-2026.webp";

/*
 * Ganesh Utsav 2026 — Reel & Photography competitions.
 *
 * An upcoming event, not a photo album, so it doesn't live as a folder under
 * assets/events: events.js turns every folder there into a gallery card, and a
 * lone poster would have shown up as a one-photo album.
 *
 * SUBMISSIONS_CLOSE is the single switch for everything time-based. Once it
 * passes, the site-wide popup and the Events-page highlight stop appearing and
 * the event page swaps its submit button for a closed note — nobody has to
 * remember to take the promotion down.
 */

export const GANESH_UTSAV_PATH = "/events/ganesh-utsav-2026";

// Month is 0-indexed, so 8 is September. The last second of the deadline day.
export const SUBMISSIONS_CLOSE = new Date(2026, 8, 18, 23, 59, 59);

export const isSubmissionOpen = (now = new Date()) => now <= SUBMISSIONS_CLOSE;

// The poster's intrinsic size: width/height attributes stop the layout jumping
// while it loads, and the popup sizes itself to this shape.
export const POSTER_WIDTH = 1024;
export const POSTER_HEIGHT = 1536;

export const ganeshUtsav = {
  title: "गणेश उत्सव 2026",
  subtitle: "श्रेष्ठ रील एवं फोटोग्राफी प्रतियोगिता",
  tagline: "पल सहेजें • यादें बनाएँ • उत्सव मनाएँ!",
  venue: "गणेश उत्सव – रांकण भवन, रानी",
  deadlineLabel: "18 सितंबर 2026",
  deadlineLabelEn: "18 Sept 2026",
  formUrl: "https://forms.gle/sQzB73fR8pYHYaXJ9",
  poster,
  posterAlt:
    "गणेश उत्सव 2026 का पोस्टर: श्रेष्ठ गणेश उत्सव रील प्रतियोगिता एवं फोटोग्राफी प्रतियोगिता, गणेश उत्सव – रांकण भवन, रानी। प्रस्तुति की अंतिम तिथि 18 सितंबर 2026। आयोजन: Hariprabodham Atmiya Youth Foundation।",
};
