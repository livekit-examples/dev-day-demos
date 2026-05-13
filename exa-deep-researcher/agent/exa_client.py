"""
EXA API client for deep research using official exa_py SDK
"""
import os
import asyncio
import logging
from typing import List, Optional
from exa_py import Exa

try:
    from agent.schemas import EXASearchParams, EXAContentOptions, EXAResult, EXAContent, _MAX_AGE_TO_LIVECRAWL
except ImportError:
    from schemas import EXASearchParams, EXAContentOptions, EXAResult, EXAContent, _MAX_AGE_TO_LIVECRAWL

logger = logging.getLogger("exa-client")
logger.setLevel(logging.INFO)


class EXAClient:
    """Client for EXA API using official SDK"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("EXA_API_KEY")
        if not self.api_key:
            raise ValueError("EXA_API_KEY environment variable or api_key parameter is required")
        
        self.client = Exa(self.api_key)
        self.client.headers["x-exa-integration"] = "livekit-integration"
    
    async def search(
        self,
        params: EXASearchParams,
        retry_count: int = 3,
        backoff_factor: float = 2.0
    ) -> List[EXAResult]:
        """Search using EXA API."""
        kwargs = {
            "num_results": params.num_results or 10,
        }
        
        if params.search_type:
            kwargs["type"] = params.search_type
        if params.result_category:
            kwargs["category"] = params.result_category
        if params.start_published_date:
            kwargs["start_published_date"] = params.start_published_date
        if params.end_published_date:
            kwargs["end_published_date"] = params.end_published_date
        if params.start_crawl_date:
            kwargs["start_crawl_date"] = params.start_crawl_date
        if params.end_crawl_date:
            kwargs["end_crawl_date"] = params.end_crawl_date
        if params.include_domains:
            kwargs["include_domains"] = params.include_domains
        if params.exclude_domains:
            kwargs["exclude_domains"] = params.exclude_domains
        if params.include_text:
            kwargs["include_text"] = [params.include_text] if isinstance(params.include_text, str) else params.include_text
        if params.exclude_text:
            kwargs["exclude_text"] = [params.exclude_text] if isinstance(params.exclude_text, str) else params.exclude_text
        
        # Retry logic with exponential backoff
        for attempt in range(retry_count):
            try:
                # Run in executor to avoid blocking
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.search(params.query, **kwargs)
                )
                
                # Parse results
                results = []
                for item in response.results:
                    result = EXAResult(
                        id=item.id,
                        url=item.url,
                        title=item.title or "",
                        score=getattr(item, 'score', None),
                        published_date=getattr(item, 'published_date', None),
                        author=getattr(item, 'author', None)
                    )
                    results.append(result)
                
                return results
                
            except Exception as e:
                logger.error(f"EXA search error (attempt {attempt + 1}/{retry_count}): {e}")
                if attempt == retry_count - 1:
                    raise
                await asyncio.sleep(backoff_factor ** attempt)
        
        return []
    
    async def get_contents(
        self,
        urls: List[str],
        options: EXAContentOptions,
        retry_count: int = 3,
        backoff_factor: float = 2.0
    ) -> List[EXAContent]:
        """
        Get contents for a list of URLs
        
        Args:
            urls: List of URLs to fetch content for
            options: Content fetch options
            retry_count: Number of retries on failure
            backoff_factor: Exponential backoff multiplier
            
        Returns:
            List of content objects
        """
        # Build kwargs for get_contents based on EXA SDK signature
        kwargs = {}
        
        # Highlights default, text opt-in
        if options.highlights:
            if options.max_characters:
                kwargs["highlights"] = {"max_characters": options.max_characters}
            else:
                kwargs["highlights"] = True

        if options.text:
            kwargs["text"] = True

        if options.max_age_hours is not None:
            livecrawl_val = _MAX_AGE_TO_LIVECRAWL.get(options.max_age_hours, "fallback")
            kwargs["livecrawl"] = livecrawl_val

        if options.subpages:
            kwargs["subpages"] = options.subpages
        if options.subpage_target:
            kwargs["subpage_target"] = options.subpage_target
        
        # Retry logic with exponential backoff
        for attempt in range(retry_count):
            try:
                # Run in executor to avoid blocking
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: self.client.get_contents(urls, **kwargs)
                )
                
                # Parse results
                contents = []
                for item in response.results:
                    raw_text = getattr(item, 'text', None)
                    raw_highlights = getattr(item, 'highlights', None)
                    raw_summary = getattr(item, 'summary', None)
                    
                    contents.append(EXAContent(
                        id=item.id,
                        url=item.url,
                        title=item.title or "",
                        text=raw_text,
                        highlights=raw_highlights,
                        summary=raw_summary
                    ))
                
                return contents
                
            except Exception as e:
                logger.error(f"EXA get_contents error (attempt {attempt + 1}/{retry_count}): {e}")
                if attempt == retry_count - 1:
                    raise
                await asyncio.sleep(backoff_factor ** attempt)
        
        return []

