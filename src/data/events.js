import eventsMeta from "./eventsMeta";

// Auto-import every event photo. Each subfolder of assets/events is one event;
// the folder name becomes the title (special chars -> spaces) and the slug.
// eslint-disable-next-line no-undef
const ctx = require.context("../assets/events", true, /\.webp$/);

const byFolder = {};
ctx
  .keys()
  .sort()
  .forEach((key) => {
    // key looks like "./Prarambh_Shibir/066A3834.webp"
    const match = key.match(/^\.\/([^/]+)\//);
    if (!match) return;
    const folder = match[1];
    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push(ctx(key));
  });

const slugify = (s) =>
  s
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .toLowerCase();

const titleize = (s) => s.replace(/[_-]+/g, " ").trim();

const events = Object.keys(byFolder)
  .map((folder) => {
    const images = byFolder[folder];
    return {
      slug: slugify(folder),
      folder,
      title: titleize(folder),
      date: (eventsMeta[folder] || {}).date || null,
      images,
      thumbnail: images[0],
    };
  })
  // newest first (events without a date sort last)
  .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

export default events;

export const getEventBySlug = (slug) => events.find((e) => e.slug === slug);

export const formatEventDate = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};
