import '../styles/global/global.css'
import '../styles/global/nprogress.css'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import Layout from '../components/layout'
import { PostsProvider } from '../context/PostsContext'

export default function MyApp({ Component, pageProps }) {
  return (
    <PostsProvider value={pageProps.postsContextValue}>
      <Layout postData={pageProps.postData}>
        <Component {...pageProps} />
      </Layout>
    </PostsProvider>
  )
}