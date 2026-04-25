import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stock/:path*",
    "/entries/:path*",
    "/outputs/:path*",
    "/services/:path*",
    "/products/:path*",
    "/suppliers/:path*",
    "/reports/:path*",
    "/users/:path*",
  ],
};
