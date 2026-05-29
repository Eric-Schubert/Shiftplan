const bearerSecurity = [{ bearerAuth: [] }];

const mobileApiOpenApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Schichtplaner Mobile API",
    version: "0.1.0",
    description: "Contract for the initial Flutter mobile client.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth", description: "Session and token endpoints" },
    { name: "Planning", description: "Weekly shift planning endpoints" },
    { name: "Reference", description: "Read-only reference data" },
  ],
  paths: {
    "/api/openapi": {
      get: {
        tags: ["Reference"],
        operationId: "getOpenApiDocument",
        summary: "Read this API contract",
        responses: {
          "200": {
            description: "OpenAPI document",
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        operationId: "login",
        summary: "Create a cookie session or a bearer token session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated session",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "429": { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/auth/session": {
      get: {
        tags: ["Auth"],
        operationId: "getSession",
        summary: "Read the current session state",
        security: bearerSecurity,
        responses: {
          "200": {
            description: "Current session state",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSessionResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        operationId: "logout",
        summary: "Destroy the current session",
        security: bearerSecurity,
        responses: {
          "200": {
            description: "Session was cleared",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LogoutResponse" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/staff": {
      get: {
        tags: ["Reference"],
        operationId: "listStaff",
        summary: "List staff records",
        responses: {
          "200": {
            description: "Staff records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Staff" },
                },
              },
            },
          },
        },
      },
    },
    "/api/shift": {
      get: {
        tags: ["Reference"],
        operationId: "listShifts",
        summary: "List shift records",
        responses: {
          "200": {
            description: "Shift records",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Shift" },
                },
              },
            },
          },
        },
      },
    },
    "/api/shiftplan": {
      get: {
        tags: ["Planning"],
        operationId: "getWeeklyPlan",
        summary: "Read one weekly shift plan",
        parameters: [
          { $ref: "#/components/parameters/Year" },
          { $ref: "#/components/parameters/Week" },
        ],
        responses: {
          "200": {
            description: "Weekly shift plan",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WeeklyShiftplan" },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/shiftplan/assign": {
      post: {
        tags: ["Planning"],
        operationId: "assignStaffToShift",
        summary: "Assign staff to a shift in one week",
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ShiftAssignmentRequest" },
            },
          },
        },
        responses: {
          "200": { $ref: "#/components/responses/MutationSuccess" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/shiftplan/unassign": {
      post: {
        tags: ["Planning"],
        operationId: "unassignStaffFromShift",
        summary: "Remove staff from a shift in one week",
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ShiftAssignmentRequest" },
            },
          },
        },
        responses: {
          "200": { $ref: "#/components/responses/MutationSuccess" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
      },
    },
    parameters: {
      Year: {
        name: "year",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 2020, maximum: 2100 },
      },
      Week: {
        name: "week",
        in: "query",
        required: false,
        schema: { type: "integer", minimum: 1, maximum: 53 },
      },
    },
    responses: {
      BadRequest: {
        description: "Request validation failed",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Authentication required or invalid",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Authenticated user is not allowed to perform the action",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      TooManyRequests: {
        description: "Login rate limit exceeded",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      MutationSuccess: {
        description: "Mutation result",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MutationSuccessResponse" },
          },
        },
      },
    },
    schemas: {
      ApiErrorResponse: {
        type: "object",
        required: ["statusCode", "statusMessage"],
        properties: {
          statusCode: { type: "integer" },
          statusMessage: { type: "string" },
          message: { type: "string" },
          data: {},
        },
      },
      LoginRequest: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", minLength: 3, maxLength: 100 },
          password: { type: "string", minLength: 1, maxLength: 256 },
          responseMode: {
            type: "string",
            enum: ["cookie", "token"],
            default: "cookie",
          },
        },
      },
      LoginResponse: {
        oneOf: [
          { $ref: "#/components/schemas/CookieLoginResponse" },
          { $ref: "#/components/schemas/TokenLoginResponse" },
        ],
      },
      CookieLoginResponse: {
        type: "object",
        required: ["success", "user"],
        properties: {
          success: { type: "boolean", const: true },
          user: { $ref: "#/components/schemas/SessionUser" },
        },
      },
      TokenLoginResponse: {
        type: "object",
        required: ["success", "user", "tokenType", "sessionToken", "expiresAt"],
        properties: {
          success: { type: "boolean", const: true },
          user: { $ref: "#/components/schemas/SessionUser" },
          tokenType: { type: "string", const: "Bearer" },
          sessionToken: { type: "string", minLength: 32 },
          expiresAt: { type: "string", format: "date-time" },
        },
      },
      AuthSessionResponse: {
        oneOf: [
          {
            type: "object",
            required: ["authenticated"],
            properties: { authenticated: { type: "boolean", const: false } },
          },
          {
            type: "object",
            required: ["authenticated", "user"],
            properties: {
              authenticated: { type: "boolean", const: true },
              user: { $ref: "#/components/schemas/SessionUser" },
              csrfToken: { type: ["string", "null"] },
            },
          },
        ],
      },
      LogoutResponse: {
        type: "object",
        required: ["success"],
        properties: { success: { type: "boolean", const: true } },
      },
      MutationSuccessResponse: {
        type: "object",
        required: ["success"],
        properties: { success: { type: "boolean" } },
      },
      SessionUser: {
        type: "object",
        required: ["userId", "username", "role"],
        properties: {
          userId: { type: "integer" },
          username: { type: "string" },
          role: { type: "string", enum: ["admin", "planner"] },
        },
      },
      Staff: {
        type: "object",
        required: ["staff_id", "name", "active", "is_parttime"],
        properties: {
          staff_id: { type: "integer" },
          name: { type: "string" },
          active: { type: "integer", enum: [0, 1] },
          is_parttime: { type: "integer", enum: [0, 1] },
        },
      },
      Shift: {
        type: "object",
        required: [
          "shift_id",
          "name",
          "active",
          "start_time",
          "end_time",
          "color",
          "min_staff",
          "sort_order",
        ],
        properties: {
          shift_id: { type: "integer" },
          name: { type: "string" },
          active: { type: "integer", enum: [0, 1] },
          start_time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          end_time: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          color: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
          min_staff: { type: "integer", minimum: 0 },
          sort_order: { type: "integer" },
        },
      },
      Week: {
        type: "object",
        required: ["week_id", "year", "week_number"],
        properties: {
          week_id: { type: "integer" },
          year: { type: "integer", minimum: 2020, maximum: 2100 },
          week_number: { type: "integer", minimum: 1, maximum: 53 },
        },
      },
      ShiftWithStaff: {
        allOf: [
          { $ref: "#/components/schemas/Shift" },
          {
            type: "object",
            required: ["assigned_staff"],
            properties: {
              assigned_staff: {
                type: "array",
                items: { $ref: "#/components/schemas/Staff" },
              },
            },
          },
        ],
      },
      WeeklyShiftplan: {
        type: "object",
        required: ["week", "shifts", "pattern_week"],
        properties: {
          week: { $ref: "#/components/schemas/Week" },
          shifts: {
            type: "array",
            items: { $ref: "#/components/schemas/ShiftWithStaff" },
          },
          pattern_week: { type: "integer" },
        },
      },
      ShiftAssignmentRequest: {
        type: "object",
        required: ["staff_id", "shift_id", "year", "week"],
        properties: {
          staff_id: { type: "integer", minimum: 1 },
          shift_id: { type: "integer", minimum: 1 },
          year: { type: "integer", minimum: 2020, maximum: 2100 },
          week: { type: "integer", minimum: 1, maximum: 53 },
        },
      },
    },
  },
} as const;

export function getOpenApiDocument() {
  return mobileApiOpenApiDocument;
}
