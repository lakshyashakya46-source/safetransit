import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import { config } from "../config/env.js";

export async function login(req, res) {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email });

  if (!user || user.active === false) {
    return res.status(401).json({ message: "Invalid email or user is deactivated." });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      depot: user.depot,
      email: user.email
    },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      depot: user.depot || "Jaipur Central",
      phone: user.phone || "+91 98290 12345"
    }
  });
}

export async function getMe(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    depot: user.depot,
    phone: user.phone
  });
}

export async function getUsers(req, res) {
  const users = await User.find();
  const sanitized = users.map(u => ({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    depot: u.depot,
    phone: u.phone,
    active: u.active
  }));
  res.json(sanitized);
}

export async function register(req, res) {
  const { name, email, password, role, depot, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password, and role are required." });
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return res.status(400).json({ message: "A user with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    name,
    email: email.toLowerCase().trim(),
    password: passwordHash,
    role,
    depot: depot || "Jaipur Central",
    phone: phone || "+91 98290 00000",
    active: true
  });

  const token = jwt.sign(
    {
      id: newUser._id.toString(),
      name: newUser.name,
      role: newUser.role,
      depot: newUser.depot,
      email: newUser.email
    },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      depot: newUser.depot,
      phone: newUser.phone
    }
  });
}

export async function switchDemoRole(req, res) {
  const { role } = req.body;
  const roleEmailMap = {
    AUTHORITY_ADMIN: "authority@demo.com",
    DEPOT_OFFICER: "officer@demo.com",
    DRIVER: "driver@demo.com",
    CONDUCTOR: "conductor@demo.com",
    ACCOUNTS: "accounts@demo.com"
  };

  const targetEmail = roleEmailMap[role];
  let user = await User.findOne({ email: targetEmail });

  if (!user) {
    user = await User.findOne({ role });
  }

  if (!user) {
    return res.status(404).json({ message: `No active account found for role ${role}` });
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      role: user.role,
      depot: user.depot,
      email: user.email
    },
    config.jwtSecret,
    { expiresIn: "24h" }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      depot: user.depot,
      phone: user.phone
    }
  });
}
