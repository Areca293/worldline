import { useState } from 'react'
import { Link } from 'react-router-dom'
import { publishedLabel, safeExternalUrl } from '../lib/presentation'
import type { Article } from './types'
import { RepositoryStats } from './repositories'
import { BookmarkButton } from '../bookmarks/BookmarkButton'

export function Metadata({ article }: { article: Article }) {
  return (
    <div className="metadata">
      <a
        href={safeExternalUrl(article.source.website_url)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {article.source.name}
      </a>

      {article.published_at ? (
        <time dateTime={article.published_at}>
          {publishedLabel(article.published_at)}
        </time>
      ) : (
        <span>{publishedLabel(null)}</span>
      )}
    </div>
  )
}

export function TopicTag({ article }: { article: Article }) {
  return (
    <div className="eyebrow">
      {article.topic.name}
      {article.is_sample && <span className="sample-tag">Sample</span>}
    </div>
  )
}

export function ArticleCard({
  article,
  lead = false,
}: {
  article: Article
  lead?: boolean
}) {
  const [failedImage, setFailedImage] = useState('')
  const image =
    article.image_url && article.image_url !== failedImage
      ? safeExternalUrl(article.image_url)
      : undefined
  return (
    <article className={lead ? 'lead-card' : 'article-row'}>
      <div className="article-copy">
        <TopicTag article={article} />
        <div className="card-heading">
          <h3>
            <Link to={`/articles/${article.slug}`}>{article.title}</Link>
          </h3>
          {safeExternalUrl(article.original_url) && (
            <a
              className="row-arrow"
              href={safeExternalUrl(article.original_url)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${article.repository ? 'Open repository' : 'Open original article'}: ${article.title} (opens in a new tab)`}
              title={
                article.repository ? 'Open repository' : 'Open original article'
              }
            >
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        <div className={`card-content ${image ? 'with-media' : ''}`}>
          <div className="card-text">
            <p>
              {article.summary ||
                'No summary was provided by the source. Open the original article to read more.'}
            </p>
            <RepositoryStats article={article} />
          </div>
          {image && (
            <figure className="card-media">
              <a
                href={safeExternalUrl(article.original_url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View image source: ${article.title} (opens in a new tab)`}
              >
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImage(article.image_url || '')}
                />
              </a>
              <figcaption>
                {article.image_credit || `Via ${article.source.name}`}
              </figcaption>
            </figure>
          )}
        </div>
        <a
          className="card-source"
          href={safeExternalUrl(article.source.website_url)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {article.source.name}
        </a>
        <div className="card-footer">
          {article.published_at ? (
            <time dateTime={article.published_at}>
              {article.repository ? 'Created ' : ''}
              {publishedLabel(article.published_at)}
            </time>
          ) : (
            <span>{publishedLabel(null)}</span>
          )}
          <BookmarkButton article={article} />
        </div>
      </div>
    </article>
  )
}
