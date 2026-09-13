import { apiPath } from "@eidolon/config";
import { app } from "@/index";
import { TEST_TOKEN } from "./tests/support/session";

const H = { "Content-Type": "application/json", Authorization: `Bearer ${TEST_TOKEN}` };
const BASE = `http://local${apiPath("personas")}`;

const made = await app.request(BASE, {
  method: "POST", headers: H, body: JSON.stringify({ name: "__http_probe" }),
});
console.log("POST /personas ->", made.status);
const { persona } = (await made.json()) as any;

const patched = await app.request(`${BASE}/${persona.id}`, {
  method: "PATCH", headers: H,
  body: JSON.stringify({ bio: "I fix things at night.", likes: "rain, ramen" }),
});
console.log("PATCH /personas/:id ->", patched.status);

const chap = await app.request(`${BASE}/${persona.id}/chapters`, {
  method: "POST", headers: H,
  body: JSON.stringify({ title: "The move", body: "I left in March." }),
});
console.log("POST chapters ->", chap.status);

const listed = await app.request(BASE, { headers: H });
const body = (await listed.json()) as any;
const mine = body.personas.find((p: any) => p.id === persona.id);
console.log("GET /personas ->", listed.status, "| bio:", mine.bio, "| chapters:", mine.chapters.length);

const pin = await app.request(`http://local${apiPath("characters")}/emma/persona`, {
  method: "PUT", headers: H, body: JSON.stringify({ personaId: persona.id }),
});
console.log("PUT character persona ->", pin.status);
await app.request(`http://local${apiPath("characters")}/emma/persona`, {
  method: "PUT", headers: H, body: JSON.stringify({ personaId: null }),
});

const gone = await app.request(`${BASE}/${persona.id}`, { method: "DELETE", headers: H });
console.log("DELETE /personas/:id ->", gone.status);

const unauth = await app.request(BASE);
console.log("GET without a token ->", unauth.status, "(must not be 200)");
