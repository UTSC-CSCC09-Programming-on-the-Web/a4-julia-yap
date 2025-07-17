/**
 * This file is from Cho's repository.
 *
 * Generic input validation helper.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Array} schema - Array of field definitions:
 *   Example:
 *   [
 *     { name: "title", required: true, type: "string", location: "body" },
 *     { name: "author", required: true, type: "string", location: "body" },
 *     { name: "file", required: true, type: "file", location: "file" },
 *   ]
 * @returns {Boolean} true if valid, false if response sent
 */
export function validateInput(req, res, schema) {
  for (const field of schema) {
    const value = field.location === "file" ? req.file : req.body[field.name];

    if (
      field.required &&
      (value === undefined || value === null || value === "")
    ) {
      res.status(422).json({
        error: `Invalid input parameters. Expected ${field.name}`,
        code: "MISSING_FIELD",
      });
      return false;
    }
    if (
      field.type === "number" &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      isNaN(value)
    ) {
      res.status(422).json({
        error: `Invalid input parameters. Expected ${field.name} to be a number`,
        code: "INVALID_TYPE",
      });
      return false;
    }
  }
  return true;
}
