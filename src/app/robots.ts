import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/private/', '/dashboard/'],
        },
        sitemap: 'https://libro-books.vercel.app/sitemap.xml',
    }
}
