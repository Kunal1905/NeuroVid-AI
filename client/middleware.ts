import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, redirectToSignIn } = await auth();
  
  // If user is not authenticated and trying to access protected routes
  if (!userId && !isPublicRoute(req)) {
    return redirectToSignIn({ returnBackUrl: '/dashboard' });
  }
  
  // If user is authenticated and on a public route other than dashboard, redirect to dashboard
  if (userId && (req.nextUrl.pathname === '/' || req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
    const newUrl = new URL('/dashboard', req.url);
    return Response.redirect(newUrl);
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}