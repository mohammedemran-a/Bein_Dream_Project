"use client";

import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/useAuthStore";
import { getMatches, createMatch, updateMatch, deleteMatch, Match } from "@/api/football_matches";
import { BASE_URL } from "@/api/axios";

export default function AdminMatches() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();

  // 🟢 جلب المباريات
  const { data, isLoading, isError } = useQuery({
    queryKey: ["matches"],
    queryFn: getMatches,
    enabled: hasPermission("matches_view"),
  });

  // 🎯 Mutations
  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createMatch(formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) =>
      updateMatch(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMatch(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });

  // 🧩 حالات النموذج
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState<{
    team1: string;
    team2: string;
    date: string;
    time: string;
    channel: string;
    result: string;
    status: "قادمة" | "جارية" | "منتهية";
    team1_logo: File | null;
    team2_logo: File | null;
  }>({
    team1: "",
    team2: "",
    date: "",
    time: "",
    channel: "",
    result: "",
    status: "قادمة",
    team1_logo: null,
    team2_logo: null,
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const { id } = e.target;
      setFormData((prev) => ({ ...prev, [id]: e.target.files![0] }));
    }
  };

  const resetForm = () => {
    setFormData({
      team1: "",
      team2: "",
      date: "",
      time: "",
      channel: "",
      result: "",
      status: "قادمة",
      team1_logo: null,
      team2_logo: null,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("team1", formData.team1);
    fd.append("team2", formData.team2);
    fd.append("date", formData.date);
    fd.append("time", formData.time);
    fd.append("channel", formData.channel);
    fd.append("result", formData.result);
    fd.append("status", formData.status);

    if (formData.team1_logo) fd.append("team1_logo", formData.team1_logo);
    if (formData.team2_logo) fd.append("team2_logo", formData.team2_logo);

    if (editingMatch) fd.append("_method", "PUT"); // لإرسال تحديث PUT

    try {
      if (editingMatch) {
        if (!hasPermission("matches_edit")) return alert("🚫 ليس لديك صلاحية التعديل!");
        await updateMutation.mutateAsync({ id: editingMatch.id!, data: fd });
      } else {
        if (!hasPermission("matches_create")) return alert("🚫 ليس لديك صلاحية الإضافة!");
        await createMutation.mutateAsync(fd);
      }
      setIsDialogOpen(false);
      setEditingMatch(null);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatch(match);
    setFormData({
      team1: match.team1,
      team2: match.team2,
      date: match.date,
      time: match.time,
      channel: match.channel,
      result: match.result || "",
      status: match.status,
      team1_logo: null,
      team2_logo: null,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!hasPermission("matches_delete")) return alert("🚫 ليس لديك صلاحية الحذف!");
    if (!confirm("هل أنت متأكد من حذف المباراة؟")) return;
    deleteMutation.mutate(id);
  };

  // 🔄 تحديث الحالة تلقائيًا بناءً على الوقت
  const getUpdatedStatus = (match: Match) => {
    const [hours, minutes] = match.time.split(":");
    const matchStart = new Date(match.date);
    matchStart.setHours(Number(hours), Number(minutes), 0, 0);
    const matchEnd = new Date(matchStart.getTime() + 100 * 60000); // 100 دقيقة تقريبًا
    const now = new Date();

    if (now >= matchEnd) return "منتهية" as const;
    else if (now >= matchStart) return "جارية" as const;
    return "قادمة" as const;
  };

  const [matchesState, setMatchesState] = useState<Match[]>([]);

  useEffect(() => {
    if (data) setMatchesState(data);
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMatchesState((prev) =>
        prev.map((match) => ({ ...match, status: getUpdatedStatus(match) }))
      );
    }, 60000); // تحديث كل دقيقة
    return () => clearInterval(interval);
  }, []);

  if (!hasPermission("matches_view")) {
    return (
      <AdminLayout>
        <p className="text-center text-red-600 text-lg mt-10">
          🚫 ليس لديك صلاحية عرض المباريات
        </p>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <p className="text-center mt-10">⏳ جارٍ تحميل المباريات...</p>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout>
        <p className="text-center text-red-600 mt-10">❌ حدث خطأ أثناء تحميل البيانات</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">إدارة المباريات</h1>

          {hasPermission("matches_create") && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setEditingMatch(null);
                    resetForm();
                  }}
                >
                  <Plus className="w-4 h-4" /> إضافة مباراة
                </Button>
              </DialogTrigger>

              <DialogContent dir="rtl" className="sm:max-w-[600px] text-right">
                <DialogHeader>
                  <DialogTitle>
                    {editingMatch ? "تعديل المباراة" : "إضافة مباراة جديدة"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMatch
                      ? "قم بتعديل بيانات المباراة ثم اضغط تحديث"
                      : "أدخل بيانات المباراة الجديدة ثم اضغط حفظ"}
                  </DialogDescription>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="team1">الفريق الأول</Label>
                      <Input id="team1" value={formData.team1} onChange={handleChange} required />
                      {editingMatch?.team1_logo && !formData.team1_logo && (
                        <img
                          src={`${BASE_URL}/storage/${editingMatch.team1_logo}`}
                          alt="team1"
                          className="w-24 h-24 object-cover mt-2 rounded"
                        />
                      )}
                      <Input type="file" id="team1_logo" accept="image/*" onChange={handleFileChange} className="mt-2" />
                    </div>

                    <div>
                      <Label htmlFor="team2">الفريق الثاني</Label>
                      <Input id="team2" value={formData.team2} onChange={handleChange} required />
                      {editingMatch?.team2_logo && !formData.team2_logo && (
                        <img
                          src={`${BASE_URL}/storage/${editingMatch.team2_logo}`}
                          alt="team2"
                          className="w-24 h-24 object-cover mt-2 rounded"
                        />
                      )}
                      <Input type="file" id="team2_logo" accept="image/*" onChange={handleFileChange} className="mt-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">التاريخ</Label>
                      <Input id="date" type="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div>
                      <Label htmlFor="time">الوقت</Label>
                      <Input id="time" type="time" value={formData.time} onChange={handleChange} required />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="channel">القناة الناقلة</Label>
                    <Input id="channel" value={formData.channel} onChange={handleChange} required />
                  </div>

                  <div>
                    <Label htmlFor="result">النتيجة</Label>
                    <Input id="result" placeholder="مثال: 2-1" value={formData.result} onChange={handleChange} />
                  </div>

                  <div>
                    <Label htmlFor="status">الحالة</Label>
                    <select id="status" value={formData.status} onChange={handleChange} className="border rounded-md w-full p-2">
                      <option value="قادمة">قادمة</option>
                      <option value="جارية">جارية</option>
                      <option value="منتهية">منتهية</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      إلغاء
                    </Button>
                    <Button type="submit">{editingMatch ? "تحديث" : "حفظ"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة المباريات</CardTitle>
          </CardHeader>
          <CardContent dir="rtl" className="overflow-x-auto">
            <Table className="min-w-full border-collapse text-center">
              <TableHeader>
                <TableRow>
                  <TableHead>الفريق الأول</TableHead>
                  <TableHead>الشعار</TableHead>
                  <TableHead>الفريق الثاني</TableHead>
                  <TableHead>الشعار</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الوقت</TableHead>
                  <TableHead>القناة</TableHead>
                  <TableHead>النتيجة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>العمليات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matchesState.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.team1}</TableCell>
                    <TableCell>
                      {match.team1_logo ? <img src={`${BASE_URL}/storage/${match.team1_logo}`} className="w-12 h-12 object-cover rounded" /> : "-"}
                    </TableCell>
                    <TableCell>{match.team2}</TableCell>
                    <TableCell>
                      {match.team2_logo ? <img src={`${BASE_URL}/storage/${match.team2_logo}`} className="w-12 h-12 object-cover rounded" /> : "-"}
                    </TableCell>
                    <TableCell>{match.date}</TableCell>
                    <TableCell>{match.time}</TableCell>
                    <TableCell>{match.channel}</TableCell>
                    <TableCell>{match.result || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={match.status === "منتهية" ? "outline" : match.status === "جارية" ? "default" : "secondary"}>
                        {match.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        {hasPermission("matches_edit") && (
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(match)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {hasPermission("matches_delete") && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(match.id!)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
