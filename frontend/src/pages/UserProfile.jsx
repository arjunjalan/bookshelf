import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { socialApi } from '../api/social'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import ErrorBanner from '../components/ui/ErrorBanner'

export default function UserProfile() {
  const { handle } = useParams()
  const queryClient = useQueryClient()

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['user-profile', handle],
    queryFn: () => socialApi.getUserProfile(handle).then((r) => r.data),
    retry: false,
    staleTime: 60_000,
  })

  const myProfile = queryClient.getQueryData(['social-profile', 'me'])

  const followMutation = useMutation({
    mutationFn: () => socialApi.followUser(handle),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-profile', handle] })
      const prev = queryClient.getQueryData(['user-profile', handle])
      queryClient.setQueryData(['user-profile', handle], (old) =>
        old ? { ...old, is_following: true, follower_count: old.follower_count + 1 } : old
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['user-profile', handle], ctx?.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', handle] })
    },
  })

  const unfollowMutation = useMutation({
    mutationFn: () => socialApi.unfollowUser(handle),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['user-profile', handle] })
      const prev = queryClient.getQueryData(['user-profile', handle])
      queryClient.setQueryData(['user-profile', handle], (old) =>
        old ? { ...old, is_following: false, follower_count: Math.max(0, old.follower_count - 1) } : old
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['user-profile', handle], ctx?.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', handle] })
    },
  })

  const isOwnProfile = myProfile?.handle === handle

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-32 bg-stone-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (isError || !profile) {
    return <ErrorBanner message="User not found." />
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xl font-semibold shrink-0">
              {(profile.display_name || profile.handle).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-stone-900 text-lg leading-tight">
                {profile.display_name || `@${profile.handle}`}
              </p>
              <p className="text-sm text-stone-500">@{profile.handle}</p>
            </div>
          </div>

          {!isOwnProfile && myProfile && (
            profile.is_following ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unfollowMutation.mutate()}
                disabled={unfollowMutation.isPending}
              >
                Following
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => followMutation.mutate()}
                disabled={followMutation.isPending}
              >
                Follow
              </Button>
            )
          )}
        </div>

        {profile.bio && (
          <p className="text-sm text-stone-600 mt-4">{profile.bio}</p>
        )}

        <div className="flex gap-6 mt-4 pt-4 border-t border-stone-100">
          <div>
            <p className="text-lg font-semibold text-stone-900">{profile.follower_count}</p>
            <p className="text-xs text-stone-400">Followers</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-stone-900">{profile.following_count}</p>
            <p className="text-xs text-stone-400">Following</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
