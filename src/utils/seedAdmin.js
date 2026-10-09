import bcrypt from "bcryptjs";
import { User } from "../modules/users/user.model.js";

export const seedAdmin = async () => {
  const adminEmail = "admin@dharmajobs.com";

  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log("Admin already exists");
    return;
  }

  const hashedPassword = await bcrypt.hash("Admin@123", 10);

  await User.create({
    name: "Super Admin",
    email: adminEmail,
    password: hashedPassword,
    role: "admin",
  });

  console.log("Admin seeded successfully");
};
