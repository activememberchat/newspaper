import GhostContentAPI from "@tryghost/content-api";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
const cheerio = require("cheerio")
import dotenv from "dotenv"
import TurndownService from "turndown";
dotenv.config()

const api = new GhostContentAPI({
  url: process.env.GHOST_API_URL,
  key: process.env.GHOST_API_KEY,
  version: "v2.0",
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
function getDate(date) {
  const a = new Date(date || new Date());
  return a.toISOString()
}
var turndownService = new TurndownService();
try {
  fs.mkdirSync("./src/data/blog", { recursive: true })
} catch {

}
function rewriteHTML(content) {
  const $ = cheerio.load(content);
  $(
    ".kg-bookmark-content, .kg-bookmark-thumbnail, .kg-file-card-icon, .kg-file-card, .kg-bookmark-card"
  ).remove();
  return $.html();
}
const allBlogPosts = await api.posts.browse({
  limit: "all",
  include: ["tags", "authors"],
});
const sorted = allBlogPosts.sort((a, b) => {
  return new Date(a.published_at) > new Date(b.published_at) ? -1 : 1;
});
const postsDir = path.resolve(__dirname, "./src/data/blog");
fs.readdirSync(postsDir).forEach((file) => {
  fs.unlinkSync(path.join(postsDir, file));
});
turndownService.keep(["figcaption", "span"]);
sorted.map((post) => {
  fs.writeFileSync(
    path.resolve(__dirname, `./src/data/blog/${post.slug}.md`),
    `---
title: ${JSON.stringify(post.title || "No title")}
pubDatetime: ${getDate(post.published_at)}
modDatetime: ${getDate(post.updated_at)}
description: ${JSON.stringify(post.excerpt || "")}
image: ${JSON.stringify(post.feature_image || "")}
tags: [${post.tags.map((tag) => tag.name).join(",")}]
slug: ${JSON.stringify(post.slug)}
draft: false
author: ${JSON.stringify(post.authors[0]).name}
---
${turndownService.turndown(rewriteHTML(post.html)).replaceAll("  ", "")}`
  );
});
