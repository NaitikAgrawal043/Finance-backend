const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const {
    validateEmail,
    validatePassword,
    validateName,
    validateRole,
    VALID_ROLES,
} = require("../utils/validators");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Signs a JWT for the given user payload.
 * @param {{ id, email, role }} userPayload
 * @returns {string} signed JWT
 */
const signToken = (userPayload) => {
    return jwt.sign(userPayload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

/**
 * Strips sensitive fields from a user record before sending to client.
 * @param {object} user
 * @returns {object}
 */
const sanitizeUser = (user) => {
    const { password, ...safe } = user;
    return safe;
};

// ─── Signup

/**
 * Registers a new user.
 *
 * Validations performed:
 *  - name, email, password format checks
 *  - role must be valid (defaults to "viewer" if not provided)
 *  - email uniqueness (Prisma P2002 handled in errorMiddleware)
 *
 * @param {{ name, email, password, role? }} body
 * @returns {{ user, token }}
 */
const signup = async ({ name, email, password, role }) => {
    // ── Input validation 
    const nameCheck = validateName(name);
    if (!nameCheck.valid) {
        const err = new Error(nameCheck.message);
        err.statusCode = 400;
        throw err;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        const err = new Error(emailCheck.message);
        err.statusCode = 400;
        throw err;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
        const err = new Error(passwordCheck.message);
        err.statusCode = 400;
        throw err;
    }

    // Role defaults to "viewer" if not provided
    const assignedRole = role ? role.toLowerCase() : "viewer";
    const roleCheck = validateRole(assignedRole);
    if (!roleCheck.valid) {
        const err = new Error(roleCheck.message);
        err.statusCode = 400;
        throw err;
    }

    // ── Check if email already taken 
    const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
        const err = new Error("An account with this email address already exists.");
        err.statusCode = 409;
        throw err;
    }

    // ── Hash password 
    const SALT_ROUNDS = 12;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Create user 
    const user = await prisma.user.create({
        data: {
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            role: assignedRole,
            status: "active",
        },
    });

    // ── Generate token 
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return { user: sanitizeUser(user), token };
};

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Authenticates an existing user.
 *
 * Error cases:
 *  - Missing fields
 *  - Email format invalid
 *  - User not found (deliberately vague for security)
 *  - Wrong password (deliberately vague)
 *  - Inactive account
 *
 * @param {{ email, password }} body
 * @returns {{ user, token }}
 */
const login = async ({ email, password }) => {
    // ── Input presence check ────────────────────────────────────────────────
    if (!email || !password) {
        const err = new Error("Email and password are required.");
        err.statusCode = 400;
        throw err;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        const err = new Error(emailCheck.message);
        err.statusCode = 400;
        throw err;
    }

    // ── Fetch user 
    const user = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
    });

    // Deliberately use the same error for "not found" and "wrong password"
    // to prevent user enumeration attacks
    const GENERIC_AUTH_ERROR = "Invalid email or password.";

    if (!user) {
        const err = new Error(GENERIC_AUTH_ERROR);
        err.statusCode = 401;
        throw err;
    }

    // ── Check password 
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        const err = new Error(GENERIC_AUTH_ERROR);
        err.statusCode = 401;
        throw err;
    }

    // ── Block inactive users 
    if (user.status === "inactive") {
        const err = new Error(
            "Your account has been deactivated. Please contact an administrator."
        );
        err.statusCode = 403;
        throw err;
    }

    // ── Generate token 
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    return { user: sanitizeUser(user), token };
};

module.exports = { signup, login };
