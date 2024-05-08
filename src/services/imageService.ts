import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Image = {
  _id: string;
  prompt: string;
  displayImage: string;
  height: number;
  width: number;
  size: number;
  thumbnailImage: string;
};

export async function getImages(skip: number, take: number, search?: string) {
  if (search) {
    const images = (await prisma.photos.aggregateRaw({
      pipeline: [
        {
          $search: {
            index: "default",
            text: {
              query: search,
              path: {
                wildcard: "*",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            prompt: 1,
            displayImage: 1,
            height: 1,
            width: 1,
            size: 1,
            download: 1,
            thumbnailImage: 1,
            score: { $meta: "searchScore" },
          },
        },
        {
          $sort: { score: -1 },
        },

        { $skip: skip },
        {
          $limit: take,
        },
        { $sort: { download: -1 } },
        { $unset: "download" },
      ],
    })) as unknown as Image[];

    if (images) {
      return images.map((image) => ({
        id: image._id,
        prompt: image.prompt,
        displayImage: image.displayImage,
        height: image.height,
        width: image.width,
        size: image.size,
        thumbnailImage: image.thumbnailImage,
      }));
    }
  }

  return prisma.photos.findMany({
    take,
    skip,
    // where: search ? { prompt: { contains: search } } : undefined,
    orderBy: { download: "desc" },
    select: {
      id: true,
      prompt: true,
      displayImage: true,
      height: true,
      width: true,
      size: true,
      thumbnailImage: true,
    },
  });
}

export function getALLImagesIDAndPrompt() {
  return prisma.photos.findMany({
    select: { id: true, prompt: true },
    orderBy: { download: "desc" },
  });
}

export function getImageByID(id: string) {
  return prisma.photos.findUnique({
    where: { id },
    select: {
      displayImage: true,
      thumbnailImage: true,
      prompt: true,
      height: true,
      width: true,
      size: true,
      download: true,
    },
  });
}

export async function countImages(search?: string) {
  if (search) {
    const result = (await prisma.photos.aggregateRaw({
      pipeline: [
        {
          $search: {
            index: "default",
            text: {
              query: search,
              path: {
                wildcard: "*",
              },
            },
          },
        },
        {
          $project: {
            _id: 1,
            score: { $meta: "searchScore" },
          },
        },
        {
          $count: "total",
        },
      ],
    })) as unknown as { total: number }[];

    if (result.length === 0) return 0;

    return result[0].total;
  }
  return prisma.photos.count({
    where: search ? { prompt: { contains: search } } : undefined,
  });
}

export function updateImageForDownload(id: string) {
  return prisma.photos.update({
    where: { id },
    data: { download: { increment: 1 } },
  });
}
