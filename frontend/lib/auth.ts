export const AUTH_COOKIE_NAME = "ims_auth";
export const ROLE_COOKIE_NAME = "ims_role";

export type UserRole = "manager" | "employee";

type Credentials = {
  username: string;
  password: string;
};

export const getManagerCredentials = (): Credentials => ({
  username: process.env.IMS_MANAGER_USER ?? process.env.IMS_AUTH_USER ?? "admin",
  password: process.env.IMS_MANAGER_PASSWORD ?? process.env.IMS_AUTH_PASSWORD ?? "admin123"
});

export const getEmployeeCredentials = (): Credentials => ({
  username: process.env.IMS_EMPLOYEE_USER ?? "employee",
  password: process.env.IMS_EMPLOYEE_PASSWORD ?? "employee123"
});

export const resolveLoginRole = (username: string, password: string): UserRole | null => {
  const manager = getManagerCredentials();
  if (username === manager.username && password === manager.password) {
    return "manager";
  }

  const employee = getEmployeeCredentials();
  if (username === employee.username && password === employee.password) {
    return "employee";
  }

  return null;
};
