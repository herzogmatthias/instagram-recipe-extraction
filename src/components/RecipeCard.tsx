'use client';

import { InstagramRecipePost } from '@/models/InstagramRecipePost';
import { extractTitle, formatMetaPills } from '@/lib/utils/recipeHelpers';
import { StatusChip, RecipeStatus } from './StatusChip';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ExternalLink, Copy, Download, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface RecipeCardProps {
  recipe: InstagramRecipePost;
  onClick?: () => void;
  className?: string;
}

function determineStatus(recipe: InstagramRecipePost): RecipeStatus {
  if (
    recipe.recipe_data?.ingredients?.length &&
    recipe.recipe_data?.steps?.length
  ) {
    return 'ready';
  }
  if (recipe.recipe_data) {
    return 'extracting';
  }
  if (recipe.displayUrl) {
    return 'uploading_media';
  }
  return 'queued';
}

function getProgressValue(status: RecipeStatus): number {
  switch (status) {
    case 'queued':
      return 10;
    case 'scraping':
      return 30;
    case 'downloading_media':
      return 50;
    case 'uploading_media':
      return 70;
    case 'extracting':
      return 85;
    case 'ready':
      return 100;
    case 'failed':
      return 0;
    default:
      return 0;
  }
}

function isProcessingState(status: RecipeStatus): boolean {
  return ['scraping', 'downloading_media', 'uploading_media', 'extracting'].includes(status);
}

export function RecipeCard({ recipe, onClick, className }: RecipeCardProps) {
  const title = extractTitle(recipe);
  const metaPills = formatMetaPills(recipe);
  const status = determineStatus(recipe);
  const displayTags = recipe.recipe_data?.tags?.slice(0, 3) || [];
  const remainingTagsCount = (recipe.recipe_data?.tags?.length || 0) - 3;
  const progressValue = getProgressValue(status);
  const showProgress = isProcessingState(status) || status === 'queued';

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-lg transition-all duration-200 p-0 gap-0',
        'hover:-translate-y-1 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'cursor-pointer',
        status === 'failed' && 'border-destructive border-2',
        className
      )}
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Media Section with 4:5 aspect ratio */}
      <AspectRatio ratio={4 / 5} className='overflow-hidden bg-muted'>
        {recipe.displayUrl ? (
          <>
            <Image
              src={recipe.displayUrl}
              alt={title}
              fill
              className='object-cover transition-transform duration-200 group-hover:scale-105'
              sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
            />
            {/* Gradient overlay at bottom - ensuring 4.5:1 contrast */}
            <div className='absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent' />
          </>
        ) : (
          <div className='flex h-full items-center justify-center bg-muted'>
            <div className='h-12 w-12 animate-pulse rounded-lg bg-muted-foreground/20' />
          </div>
        )}

        {/* Status chip - top left */}
        <div className='absolute left-3 top-3'>
          <StatusChip status={status} />
        </div>

        {/* Progress indicator for processing states */}
        {showProgress && (
          <div className='absolute inset-x-3 bottom-16'>
            <Progress value={progressValue} className='h-1' />
          </div>
        )}

        {/* Title overlay - bottom with enhanced contrast */}
        <div className='absolute inset-x-0 bottom-0 p-3'>
          <h3 className='text-recipe-title line-clamp-2 font-heading text-white [text-shadow:_0_1px_8px_rgb(0_0_0_/_80%)]'>
            {title}
          </h3>
        </div>
      </AspectRatio>

      {/* Body Section */}
      <CardContent className='space-y-3 py-3'>
        {/* Meta Pills */}
        {metaPills.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {metaPills.map((pill, index) => (
              <Badge
                key={index}
                variant='secondary'
                className='text-recipe-meta font-normal'
              >
                {pill}
              </Badge>
            ))}
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {displayTags.map((tag, index) => (
              <Badge
                key={index}
                variant='outline'
                className='text-recipe-meta font-normal'
              >
                {tag}
              </Badge>
            ))}
            {remainingTagsCount > 0 && (
              <Badge variant='outline' className='text-recipe-meta font-normal'>
                +{remainingTagsCount}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      {/* Footer Actions */}
      <CardFooter className='justify-between border-t py-3'>
        <div className='flex gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            disabled={status !== 'ready'}
            onClick={(e) => {
              e.stopPropagation();
              // Handle open action
            }}
            aria-label='Open recipe'
          >
            <ExternalLink className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            disabled={!recipe.recipe_data?.ingredients}
            onClick={(e) => {
              e.stopPropagation();
              // Handle copy ingredients
            }}
            aria-label='Copy ingredients'
          >
            <Copy className='h-4 w-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            disabled={!recipe.recipe_data}
            onClick={(e) => {
              e.stopPropagation();
              // Handle export JSON
            }}
            aria-label='Export recipe as JSON'
          >
            <Download className='h-4 w-4' />
          </Button>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu
          }}
          aria-label='More actions'
        >
          <MoreVertical className='h-4 w-4' />
        </Button>
      </CardFooter>
    </Card>
  );
}
