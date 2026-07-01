import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { fetchPlaylistVideos, parsePlaylistId, youtubeConfigured } from "../../lib/youtube";
import { useAuth } from "../../portal/AuthContext";
import {
  Alert,
  Card,
  Field,
  Modal,
  PageHeader,
  PortalButton,
  Spinner,
  inputClass,
} from "../../portal/ui";

// The unlisted "Karyakarta" playlist that auto-feeds this page.
const MEMBER_PLAYLIST = parsePlaylistId(process.env.REACT_APP_YT_MEMBER_PLAYLIST);
const AUTO_MODE = youtubeConfigured && Boolean(MEMBER_PLAYLIST);

// Extract an 11-char YouTube id from a full URL or a raw id (manual mode).
function youtubeId(input) {
  const s = (input || "").trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const pats = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of pats) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return "";
}

const EMPTY = { title: "", url: "", description: "", category: "", sort_order: 0 };

export default function Videos() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async () => {
    setLoading(true);
    if (AUTO_MODE) {
      try {
        const items = await fetchPlaylistVideos(MEMBER_PLAYLIST);
        setVideos(
          items.map((v) => ({
            youtube_id: v.id,
            title: v.title,
            description: v.description,
            category: null,
          }))
        );
      } catch (e) {
        setMsg({ kind: "error", text: `Couldn't load from YouTube: ${e.message}` });
        setVideos([]);
      }
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) setMsg({ kind: "error", text: error.message });
    setVideos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setMsg({ kind: "", text: "" });
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (v) => {
    setMsg({ kind: "", text: "" });
    setEditingId(v.id);
    setForm({
      title: v.title || "",
      url: v.youtube_id || "",
      description: v.description || "",
      category: v.category || "",
      sort_order: v.sort_order ?? 0,
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const yid = youtubeId(form.url);
    if (!form.title.trim() || !yid) {
      setMsg({ kind: "error", text: "A title and a valid YouTube link or ID are required." });
      return;
    }
    setSaving(true);
    setMsg({ kind: "", text: "" });
    const payload = {
      title: form.title.trim(),
      youtube_id: yid,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };
    const { error } = editingId
      ? await supabase.from("videos").update(payload).eq("id", editingId)
      : await supabase.from("videos").insert(payload);
    setSaving(false);
    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }
    setOpen(false);
    setMsg({ kind: "success", text: editingId ? "Video updated." : "Video added." });
    load();
  };

  const remove = async (v) => {
    const { error } = await supabase.from("videos").delete().eq("id", v.id);
    if (error) setMsg({ kind: "error", text: error.message });
    else setVideos((vs) => vs.filter((x) => x.id !== v.id));
  };

  // Manual add/edit is only available when NOT auto-syncing from a playlist.
  const canManage = isAdmin && !AUTO_MODE;

  return (
    <div>
      <PageHeader
        title="Satsang Videos"
        subtitle="Private videos for registered karyakartas."
        actions={canManage ? <PortalButton onClick={openAdd}>+ Add video</PortalButton> : null}
      />

      {AUTO_MODE && isAdmin && (
        <div className="mb-4">
          <Alert kind="info">
            Auto-synced from the Karyakarta YouTube playlist. Add an{" "}
            <strong>Unlisted</strong> video to that playlist and it appears here on
            the next load.
          </Alert>
        </div>
      )}

      {msg.text && (
        <div className="mb-4">
          <Alert kind={msg.kind}>{msg.text}</Alert>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : videos.length === 0 ? (
        <Card>
          <p className="text-textSoft">
            No videos yet
            {canManage
              ? " — use “Add video” to share the first one."
              : AUTO_MODE
              ? ". Add Unlisted videos to the Karyakarta playlist to populate this."
              : ". Please check back soon."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div
              key={v.id || v.youtube_id}
              className="flex flex-col overflow-hidden rounded-2xl border border-sand/70 bg-white shadow-soft"
            >
              <div className="aspect-video w-full bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`}
                  title={v.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                {v.category && (
                  <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-saffron">
                    {v.category}
                  </span>
                )}
                <h3 className="font-display text-lg text-maroon">{v.title}</h3>
                {v.description && (
                  <p className="mt-1 line-clamp-3 text-sm text-textSoft">{v.description}</p>
                )}
                {canManage && (
                  <div className="mt-3 flex gap-4 pt-2 text-xs font-semibold">
                    <button onClick={() => openEdit(v)} className="text-maroon hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(v)} className="text-red-700 hover:underline">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editingId ? "Edit video" : "Add video"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="Title">
            <input required className={inputClass} value={form.title} onChange={set("title")} />
          </Field>
          <Field
            label="YouTube link or ID"
            hint="Paste the full URL (watch, youtu.be, embed) or the 11-character ID."
          >
            <input
              required
              className={inputClass}
              value={form.url}
              onChange={set("url")}
              placeholder="https://youtu.be/…"
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              rows={3}
              className={inputClass}
              value={form.description}
              onChange={set("description")}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category (optional)">
              <input
                className={inputClass}
                value={form.category}
                onChange={set("category")}
                placeholder="e.g. Pravachan"
              />
            </Field>
            <Field label="Sort order" hint="Lower shows first.">
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={set("sort_order")}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <PortalButton type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </PortalButton>
            <PortalButton type="submit" loading={saving}>
              {editingId ? "Save changes" : "Add video"}
            </PortalButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
