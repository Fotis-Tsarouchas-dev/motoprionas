import AccessoryForm from '@/components/admin/AccessoryForm';

export default async function EditAccessoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AccessoryForm id={id} />;
}
