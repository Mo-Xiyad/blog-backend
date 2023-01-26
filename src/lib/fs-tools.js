import fs from "fs-extra"; // fs-extra gives us same methods of fs (plus some extras) and gives us PROMISES!
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { readJSON, writeJSON, writeFile, createReadStream } = fs; // readJSON and writeJSON are not part of the "normal" fs module

const dataFolderPath = join(dirname(fileURLToPath(import.meta.url)), "../data"); //getting the file path of the folder that are containint all the JSON files

const blogPostsJSONpath = join(dataFolderPath, "blogPosts.json");

const publicFolderPath = join(process.cwd(), "./public/img/posts"); // process.cwd() gives me back the path to the folder in which the package.json is (ROOT OF THE PROJECT)

export const getPosts = () => readJSON(blogPostsJSONpath);

export const writePosts = (content) => writeJSON(blogPostsJSONpath, content);

export const saveBlogPostsPictures = (fileName, contentAsBuffer) =>
  writeFile(join(publicFolderPath, fileName), contentAsBuffer);

export const getPostsReadableStream = () => createReadStream(blogPostsJSONpath);
