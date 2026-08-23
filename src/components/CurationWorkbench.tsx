import React, { useState, useEffect, useMemo } from 'react';
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Badge,
  Button,
  Stack,
  Paper,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Select,
  Tabs,
  ScrollArea,
  Card,
  Divider,
  Box,
  Notification,
  Title,
  Tooltip
} from '@mantine/core';
import {
  IconBook2,
  IconGitBranch,
  IconPlus,
  IconRefresh,
  IconUpload,
  IconFileText,
  IconFileTypePdf,
  IconCheck,
  IconFolder,
  IconSparkles,
  IconArrowRight,
  IconDeviceFloppy
} from '@tabler/icons-react';
import { TaxonomyController, ThematicTree, ThematicBadgeGroup, TaxonomyNode } from '@quatrain/ux-taxonomy';
import { FileIngestDropzone, IngestFileItem } from '@quatrain/ux-dropzone';
import { CurationCard, OKFDocumentMetadata, OKFMetadataForm } from '@quatrain/ux-curation';

export function CurationWorkbench() {
  const [thematics, setThematics] = useState<TaxonomyNode[]>([]);
  const [selectedThematicId, setSelectedThematicId] = useState<string>('all');
  const [documents, setDocuments] = useState<OKFDocumentMetadata[]>([]);
  const [activeDocument, setActiveDocument] = useState<OKFDocumentMetadata | null>(null);
  const [queueTasks, setQueueTasks] = useState<IngestFileItem[]>([]);
  const [gitStatus, setGitStatus] = useState<any>({ branch: 'feat/bookworm-poc', isClean: true, uncommittedFiles: [] });
  const [isNewThematicOpen, setIsNewThematicOpen] = useState(false);
  const [newThematicLabel, setNewThematicLabel] = useState('');
  const [newThematicDesc, setNewThematicDesc] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('ingest');
  const [notification, setNotification] = useState<{ title: string; message: string; color: string } | null>(null);
  const [transversalThematics, setTransversalThematics] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const taxonomyController = useMemo(() => {
    return new TaxonomyController({
      initialNodes: thematics,
      selectedId: selectedThematicId === 'all' ? null : selectedThematicId
    });
  }, [thematics]);

  // Load initial data
  const loadThematics = async () => {
    try {
      const res = await fetch('/api/taxonomies');
      const data = await res.json();
      if (data.thematics) {
        setThematics(data.thematics);
        taxonomyController.loadNodes(data.thematics);
      }
    } catch (e) {
      console.error('Failed to load thematics:', e);
    }
  };

  const loadDocuments = async (category = selectedThematicId) => {
    try {
      const url = category && category !== 'all' ? `/api/curate?category=${category}` : '/api/curate';
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) {
        setDocuments(data.items);
      }
    } catch (e) {
      console.error('Failed to load documents:', e);
    }
  };

  const loadGitStatus = async () => {
    try {
      const res = await fetch('/api/git/status');
      const data = await res.json();
      setGitStatus(data);
    } catch (e) {
      console.error('Failed to load git status:', e);
    }
  };

  const pollQueue = async () => {
    try {
      const res = await fetch('/api/queue/status');
      const data = await res.json();
      if (data.tasks) {
        setQueueTasks(data.tasks.map((t: any) => ({
          id: t.id,
          name: t.name,
          size: t.size || 1024 * 1024,
          type: t.type || 'pdf',
          status: t.status === 'processing' ? 'processing' : t.status === 'completed' ? 'completed' : t.status === 'failed' ? 'error' : 'idle',
          progress: t.progress,
          error: t.error
        })));
      }
    } catch {}
  };

  useEffect(() => {
    loadThematics();
    loadDocuments('all');
    loadGitStatus();
  }, []);

  // Poll queue every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      pollQueue();
      loadGitStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateThematic = async () => {
    if (!newThematicLabel.trim()) return;
    try {
      const res = await fetch('/api/taxonomies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newThematicLabel, description: newThematicDesc })
      });
      const data = await res.json();
      if (data.success) {
        setIsNewThematicOpen(false);
        setNewThematicLabel('');
        setNewThematicDesc('');
        await loadThematics();
        setNotification({
          title: 'Thématique créée',
          message: `La thématique "${newThematicLabel}" a été créée et committée dans le dépôt OKF.`,
          color: 'green'
        });
      }
    } catch (e) {
      console.error('Error creating thematic:', e);
    }
  };

  const handleDropFiles = async (files: File[]) => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const cat = selectedThematicId !== 'all' ? selectedThematicId : 'soil-health';
    formData.append('category', cat);
    formData.append('thematics', JSON.stringify(transversalThematics.length > 0 ? transversalThematics : [cat]));
    formData.append('source', 'Curation Bookworm');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          title: 'Fichiers ajoutés à la file d\'ingestion',
          message: `${files.length} document(s) sont en cours d'analyse IA et de parsing PDF.`,
          color: 'blue'
        });
        pollQueue();
      }
    } catch (e) {
      console.error('Upload error:', e);
    }
  };

  const handleSaveCurated = async (metadata: OKFDocumentMetadata) => {
    setSaveLoading(true);
    try {
      const res = await fetch('/api/curate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          title: 'Curation enregistrée',
          message: `Le document "${metadata.title}" a été synchronisé et committé dans le dépôt OKF.`,
          color: 'green'
        });
        await loadDocuments(selectedThematicId);
        await loadThematics();
        await loadGitStatus();
      }
    } catch (e) {
      console.error('Save curation error:', e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleGitSync = async () => {
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'feat(curation): batch sync curated OKF knowledge base', push: false })
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          title: 'Dépôt Git synchronisé',
          message: 'Toutes les modifications OKF ont été committées en local.',
          color: 'teal'
        });
        loadGitStatus();
      }
    } catch (e) {
      console.error('Git sync error:', e);
    }
  };

  return (
    <MantineProvider defaultColorScheme="dark">
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 300, breakpoint: 'sm' }}
        aside={{ width: 340, breakpoint: 'md' }}
        padding="md"
      >
        {/* Top Header */}
        <AppShell.Header p="xs">
          <Group justify="space-between" h="100%">
            <Group gap="sm">
              <IconBook2 size={28} color="var(--mantine-color-teal-filled)" />
              <div>
                <Text fw={700} size="md" inline>
                  Bookworm
                </Text>
                <Text size="xs" c="dimmed" inline mt={2}>
                  Curation & Indexation Sémantique OKF
                </Text>
              </div>
            </Group>

            <Group gap="md">
              <Badge variant="light" color="blue" leftSection={<IconFolder size={12} />}>
                Dépôt : world-agronomy
              </Badge>

              <Badge
                variant="outline"
                color={gitStatus.isClean ? 'green' : 'orange'}
                leftSection={<IconGitBranch size={12} />}
              >
                {gitStatus.branch} ({gitStatus.isClean ? 'Propre' : `${gitStatus.uncommittedFiles?.length} modifiés`})
              </Badge>

              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={handleGitSync}
              >
                Commit Git
              </Button>
            </Group>
          </Group>
        </AppShell.Header>

        {/* Left Sidebar: Thematics Explorer */}
        <AppShell.Navbar p="md">
          <Stack justify="space-between" h="100%">
            <div>
              <Group justify="space-between" mb="sm">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Thématiques & Catégories
                </Text>
                <ActionIcon
                  size="sm"
                  variant="light"
                  color="blue"
                  onClick={() => setIsNewThematicOpen(true)}
                  aria-label="Ajouter une thématique"
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Group>

              <Button
                variant={selectedThematicId === 'all' ? 'filled' : 'subtle'}
                color="gray"
                fullWidth
                justify="start"
                size="xs"
                mb="xs"
                onClick={() => {
                  setSelectedThematicId('all');
                  loadDocuments('all');
                }}
              >
                Toutes les thématiques ({documents.length})
              </Button>

              <ThematicTree
                controller={taxonomyController}
                onSelect={(node) => {
                  setSelectedThematicId(node.id);
                  loadDocuments(node.id);
                }}
                onAddSubThematic={() => setIsNewThematicOpen(true)}
              />
            </div>

            <Paper withBorder p="xs" radius="sm" bg="var(--mantine-color-dark-7)">
              <Text size="xs" c="dimmed">
                Dernier commit :
              </Text>
              <Text size="xs" fw={500} truncate>
                {gitStatus.lastCommit || 'Initialisation'}
              </Text>
            </Paper>
          </Stack>
        </AppShell.Navbar>

        {/* Center Main Area: Curation Workbench */}
        <AppShell.Main>
          {notification && (
            <Notification
              title={notification.title}
              color={notification.color}
              onClose={() => setNotification(null)}
              mb="md"
            >
              {notification.message}
            </Notification>
          )}

          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
              <Tabs.Tab value="ingest" leftSection={<IconUpload size={16} />}>
                Ingestion & Dépôt PDF
              </Tabs.Tab>
              <Tabs.Tab
                value="curate"
                leftSection={<IconSparkles size={16} />}
                disabled={!activeDocument}
              >
                Éditeur de Curation {activeDocument ? `(${activeDocument.title})` : ''}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="ingest">
              <Stack gap="md">
                <Paper withBorder p="md" radius="md">
                  <Title order={4} mb="xs">
                    Ingestion de Documents Agronomiques
                  </Title>
                  <Text size="sm" c="dimmed" mb="md">
                    Les PDF déposés sont automatiquement parsés, analysés par l'IA Gemini pour extraire un résumé exécutif, déduire la thématique et auto-lier les concepts botaniques.
                  </Text>

                  <Group mb="md" grow>
                    <Select
                      label="Thématique cible principale"
                      data={thematics.map((t) => ({ value: t.id, label: t.label }))}
                      value={selectedThematicId !== 'all' ? selectedThematicId : 'soil-health'}
                      onChange={(val) => val && setSelectedThematicId(val)}
                    />
                  </Group>

                  {thematics.length > 0 && (
                    <ThematicBadgeGroup
                      label="Thématiques transversales pré-associées"
                      description="Associer automatiquement ces thématiques secondaires aux documents déposés"
                      nodes={thematics}
                      value={transversalThematics}
                      onChange={setTransversalThematics}
                      mb="md"
                    />
                  )}

                  <FileIngestDropzone
                    onDropFiles={handleDropFiles}
                    items={queueTasks}
                    onRemoveItem={() => {}}
                  />
                </Paper>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="curate">
              {activeDocument ? (
                <CurationCard
                  metadata={activeDocument}
                  thematics={thematics}
                  extractedText={activeDocument.body}
                  onSave={handleSaveCurated}
                  loading={saveLoading}
                />
              ) : (
                <Text c="dimmed">Sélectionnez un document à droite pour ouvrir l'éditeur de curation.</Text>
              )}
            </Tabs.Panel>
          </Tabs>
        </AppShell.Main>

        {/* Right Panel: Curated Documents List */}
        <AppShell.Aside p="md">
          <Group justify="space-between" mb="xs">
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Documents Curés ({documents.length})
            </Text>
            <ActionIcon size="sm" variant="subtle" onClick={() => loadDocuments(selectedThematicId)}>
              <IconRefresh size={14} />
            </ActionIcon>
          </Group>

          <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
            <Stack gap="xs">
              {documents.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic" p="md">
                  Aucun document curé dans cette thématique. Déposez des PDF dans l'onglet Ingestion.
                </Text>
              ) : (
                documents.map((doc) => (
                  <Card
                    key={doc.id}
                    withBorder
                    padding="xs"
                    radius="sm"
                    style={{
                      cursor: 'pointer',
                      borderLeft: activeDocument?.id === doc.id ? '4px solid var(--mantine-color-blue-filled)' : undefined
                    }}
                    onClick={() => {
                      setActiveDocument(doc);
                      setActiveTab('curate');
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap" mb={4}>
                      <Text size="sm" fw={600} truncate style={{ flex: 1 }}>
                        {doc.title}
                      </Text>
                      <IconFileTypePdf size={16} color="var(--mantine-color-red-filled)" />
                    </Group>

                    <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                      {doc.description || doc.summary || 'Sans résumé'}
                    </Text>

                    <Group justify="space-between">
                      <Badge size="xs" color="gray">
                        {doc.category}
                      </Badge>
                      <Text size="xs" c="blue" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        Éditer <IconArrowRight size={10} />
                      </Text>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </ScrollArea>
        </AppShell.Aside>
      </AppShell>

      {/* Modal: New Thematic */}
      <Modal
        opened={isNewThematicOpen}
        onClose={() => setIsNewThematicOpen(false)}
        title="Créer une nouvelle thématique OKF"
      >
        <Stack gap="md">
          <TextInput
            label="Nom de la thématique"
            placeholder="Ex: Viticulture & Agroforesterie"
            value={newThematicLabel}
            onChange={(e) => setNewThematicLabel(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description du domaine"
            placeholder="Description des concepts et techniques couverts..."
            value={newThematicDesc}
            onChange={(e) => setNewThematicDesc(e.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setIsNewThematicOpen(false)}>
              Annuler
            </Button>
            <Button color="blue" onClick={handleCreateThematic}>
              Créer & Committer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </MantineProvider>
  );
}
