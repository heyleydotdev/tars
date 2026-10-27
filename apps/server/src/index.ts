export default {
  fetch(request) {
    const { pathname } = new URL(request.url)

    if (pathname === '/health') {
      return Response.json({ ok: true })
    }

    return new Response('Not Found', { status: 404 })
  }
} satisfies ExportedHandler<Env>
