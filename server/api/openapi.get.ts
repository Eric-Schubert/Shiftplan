import { getOpenApiDocument } from "~/server/utils/openapi";

export default defineEventHandler(() => getOpenApiDocument());
