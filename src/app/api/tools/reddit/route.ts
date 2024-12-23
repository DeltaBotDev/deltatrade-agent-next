import { NextResponse } from 'next/server';

export const runtime = 'edge';

interface RedditPost {
	title: string;
	author: string;
	subreddit: string;
	score: number;
	num_comments: number;
	url: string;
}

interface RedditChild {
	data: {
		title: string;
		author: string;
		subreddit: string;
		score: number;
		num_comments: number;
		permalink: string;
	};
}

interface RedditResponse {
	data: {
		children: RedditChild[];
	};
}

export async function GET() {
	try {
		const response = await fetch('https://www.reddit.com/.json');
		if (!response.ok) {
			throw new Error('Failed to fetch Reddit frontpage');
		}
		const data: RedditResponse = await response.json();
		
		// Extract relevant information from the Reddit response
		const posts: RedditPost[] = data.data.children.map((child: RedditChild) => ({
			title: child.data.title,
			author: child.data.author,
			subreddit: child.data.subreddit,
			score: child.data.score,
			num_comments: child.data.num_comments,
			url: `https://www.reddit.com${child.data.permalink}`,
		}));

		return NextResponse.json({ posts });
	} catch (error) {
		console.error('Error fetching Reddit frontpage:', error);
		return NextResponse.json({ error: 'Failed to fetch Reddit frontpage' }, { status: 500 });
	}
}
