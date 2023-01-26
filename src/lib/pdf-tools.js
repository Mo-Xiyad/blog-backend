import { dirname, join } from "path";
import { fileURLToPath } from "url";
import PdfPrinter from "pdfmake";
import striptags from "striptags";
import axios from "axios";
import { promisify } from "util";
import { pipeline } from "stream";
import fs from "fs-extra";

const dataFolderPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../data/PDF"
);

const imgToBase64 = async (post) => {
  let image = {};
  if (post.cover) {
    const response = await axios.get(post.cover, {
      responseType: "arraybuffer",
    });
    const coverURLParts = post.cover.split("/");
    const fileName = coverURLParts[coverURLParts.length - 1];
    const [id, extension] = fileName.split(".");
    const base64 = response.data.toString("base64");
    const base64Image = `data:image/${extension};base64,${base64}`;
    image = { image: base64Image, width: 500, margin: [0, 0, 0, 40] };
  }
  return image;
};

const fonts = {
  Roboto: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

const printer = new PdfPrinter(fonts);

export const getPDFReadableStream = async (blog) => {
  const imagePart = await imgToBase64(blog);
  const docDefinition = {
    content: [
      imagePart,
      { text: blog.title, fontSize: 20, bold: true, margin: [0, 0, 0, 40] },
      { text: striptags(blog.content), lineHeight: 2 },
    ],
  };

  const pdfReadableStream = printer.createPdfKitDocument(docDefinition);

  pdfReadableStream.end();
  return pdfReadableStream;
};

export const generatePDFAsync = async (blog) => {
  const asyncPipeline = promisify(pipeline); // promisify is a (VERY COOL) utility which transforms a function that uses callbacks (error-first callbacks) into a function that uses Promises (and so Async/Await). Pipeline is a function that works with callbacks to connect 2 or more streams together --> I can promisify a pipeline getting back and asynchronous pipeline
  const image = await imgToBase64(blog);
  const docDefinition = {
    content: [
      image,
      { text: blog.title, fontSize: 20, bold: true, margin: [0, 0, 0, 40] },
      { text: striptags(blog.content), lineHeight: 2 },
    ],
  };

  const pdfReadableStream = printer.createPdfKitDocument(docDefinition);

  pdfReadableStream.end();

  //   const path = join(dirname(fileURLToPath(import.meta.url)), `${blog._id}.pdf`);
  const path = join(dataFolderPath, `${blog._id}.pdf`);
  await asyncPipeline(pdfReadableStream, fs.createWriteStream(path));

  return path;
};

// https://medium.com/@rakeshuce1990/ionic-how-to-create-pdf-file-with-pdfmake-step-by-step-75b25aa541a4

/* ================================================================= */
