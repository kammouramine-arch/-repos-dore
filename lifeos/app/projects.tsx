import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useTheme } from '@/theme';
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  ProgressBar,
  Screen,
  Sheet,
  Text,
} from '@/components/ui';
import { DateField } from '@/components/fields';
import { useProjectActions, useProjects } from '@/hooks/useProjects';
import { useEntitlements } from '@/hooks/useEntitlements';
import { friendlyDate } from '@/utils/date';

export default function Projects() {
  const theme = useTheme();
  const router = useRouter();
  const projects = useProjects('active');
  const actions = useProjectActions();
  const entitlements = useEntitlements();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState<string | null>(null);

  const allowance = entitlements.objects('projects', projects.data?.length ?? 0);
  const atLimit = allowance.atLimit;

  return (
    <Screen refreshing={projects.isRefetching} onRefresh={() => void projects.refetch()}>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Feather name="chevron-left" size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable
            onPress={() => (atLimit ? router.push('/paywall') : setOpen(true))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="New project"
          >
            <Feather name="plus" size={22} color={theme.colors.accentText} />
          </Pressable>
        </View>

        <Text variant="title1">Projects</Text>

        {atLimit ? (
          <Banner
            tone="info"
            title={`${allowance.limit} active project${allowance.limit === 1 ? '' : 's'} on ${entitlements.plan.name}`}
            body={`${allowance.upgradeTo?.name ?? 'A higher plan'} lets you run several at once, with AI roadmaps for each.`}
            actionLabel={allowance.upgradeTo ? `See ${allowance.upgradeTo.name}` : 'See plans'}
            onAction={() => router.push('/paywall')}
          />
        ) : null}

        {(projects.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="folder"
            title="What are you working toward?"
            body="A project is bigger than a task — launching something, moving house, learning a language."
            actionLabel="Add a project"
            onAction={() => setOpen(true)}
          />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            {(projects.data ?? []).map((project) => (
              <Card key={project.id} onPress={() => router.push(`/project/${project.id}`)}>
                <View style={{ gap: theme.spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="title3" style={{ flex: 1 }} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <Text variant="subhead" color="accent">
                      {project.progress}%
                    </Text>
                  </View>
                  <ProgressBar progress={project.progress} />
                  {project.due_date ? (
                    <Text variant="caption" color="tertiary">
                      Due {friendlyDate(project.due_date)}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)} title="New project">
        <Field label="Project" value={title} onChangeText={setTitle} placeholder="Launch the online store" autoFocus />
        <Field
          label="What it involves"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <DateField label="Deadline" value={due} onChange={setDue} />
        <Button
          label="Create project"
          full
          loading={actions.create.isPending}
          onPress={async () => {
            if (title.trim().length < 2) return;
            await actions.create.mutateAsync({
              title: title.trim(),
              description: description.trim() || null,
              due_date: due,
            });
            setTitle('');
            setDescription('');
            setDue(null);
            setOpen(false);
          }}
        />
        <Text variant="caption" color="tertiary" align="center">
          Ask your planner to turn it into milestones and first actions.
        </Text>
      </Sheet>
    </Screen>
  );
}
