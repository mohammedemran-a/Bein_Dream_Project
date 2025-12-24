import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner"; // ✅ toast

import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Calendar, Tv } from "lucide-react";
import {
  getLeaderboard,
  getUserPredictions,
  postPrediction,
} from "@/api/predictions.ts";
import { getMatches, Match as API_Match } from "@/api/football_matches.ts";
import { useAuthStore } from "@/store/useAuthStore";
import { BASE_URL } from "@/api/axios";

export type Match = API_Match;

export type Prediction = {
  match_id: number;
  team1: number;
  team2: number;
  submitted: boolean;
};

export type LeaderboardItem = {
  user_id: number;
  total_points: number;
  user?: { name: string };
};

const Matches = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id ?? null;
  const isGuest = !userId;

  const [predictions, setPredictions] = useState<Record<number, Prediction>>({});

  // 🟢 جلب المباريات
  const { data: matches = [], isLoading: loadingMatches } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: getMatches,
  });

  // 🟢 جلب توقعات المستخدم
  const { data: userPredictions = [], isLoading: loadingPredictions } = useQuery({
    queryKey: ["userPredictions", userId],
    queryFn: () => getUserPredictions(userId!),
    enabled: !!userId,
  });

  // 🟢 جدول المتصدرين
  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery<
    LeaderboardItem[]
  >({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  // 🟢 إرسال التوقع
  const predictionMutation = useMutation({
    mutationFn: (data: { matchId: number; team1: number; team2: number }) =>
      postPrediction({
        user_id: userId!,
        match_id: data.matchId,
        team1: data.team1,
        team2: data.team2,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPredictions"] });
      toast.success("تم إرسال التوقع بنجاح 🎉");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء إرسال التوقع ❌");
    },
  });

  // 🟢 تحديث التوقعات عند تغيير المدخلات
  const handlePredictionChange = (
    matchId: number,
    team: "team1" | "team2",
    value: string
  ) => {
    const currentPrediction: Prediction = predictions[matchId] ?? {
      match_id: matchId,
      team1: 0,
      team2: 0,
      submitted: false,
    };

    if (currentPrediction.submitted) return;

    setPredictions({
      ...predictions,
      [matchId]: {
        ...currentPrediction,
        [team]: Number(value),
      },
    });
  };

  const handleSubmitPrediction = (matchId: number) => {
    if (isGuest) {
      navigate("/auth");
      return;
    }

    const prediction = predictions[matchId];
    if (!prediction) return toast.error("❌ لم يتم إدخال أي توقع");

    if (prediction.submitted) return toast.error("تم إرسال هذا التوقع مسبقًا");

    if (!prediction.team1 && !prediction.team2) {
      return toast.error("❌ الرجاء إدخال التوقعين قبل الإرسال");
    }

    predictionMutation.mutate({
      matchId,
      team1: prediction.team1,
      team2: prediction.team2,
    });

    setPredictions({
      ...predictions,
      [matchId]: { ...prediction, submitted: true },
    });
  };

  const loading =
    loadingMatches || loadingLeaderboard || (userId && loadingPredictions);

  // 🟢 تحديث دوري لكل المباريات كل دقيقة
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-16">
        {/* مقدمة الصفحة */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-20 px-4">
          <div className="container mx-auto text-center space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">توقع واربح</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold">مباريات اليوم</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              توقع نتائج المباريات وشارك في المسابقة للفوز بجوائز قيمة
            </p>
          </div>
        </section>

        {/* بطاقات المباريات */}
        <section className="py-12 px-4">
          <div className="container mx-auto">
            {matches.length === 0 ? (
              <p className="text-center text-muted-foreground">
                لا توجد مباريات حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {matches.map((match, index) => {
                  const existingPrediction = userPredictions.find(
                    (p) => p.football_match_id === match.id
                  );

                  const prediction: Prediction = predictions[match.id!] ?? {
                    match_id: match.id!,
                    team1: existingPrediction?.team1_score ?? 0,
                    team2: existingPrediction?.team2_score ?? 0,
                    submitted: !!existingPrediction,
                  };

                  const isSubmitted =
                    prediction.submitted || !!existingPrediction;

                  return (
                    <Card
                      key={match.id}
                      className="hover-lift card-gradient border-2 animate-scale-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge>{match.status || "قادمة"}</Badge>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Tv className="h-4 w-4" />
                            {match.channel || "غير محددة"}
                          </div>
                        </div>

                        <CardTitle className="text-center text-2xl flex items-center justify-center gap-3">
                          {match.team1_logo && (
                            <img
                              src={`${BASE_URL}/storage/${match.team1_logo}`}
                              alt={match.team1}
                              className="w-10 h-10 object-cover rounded-full"
                            />
                          )}
                          {match.team1}
                          <span className="text-primary mx-3">VS</span>
                          {match.team2_logo && (
                            <img
                              src={`${BASE_URL}/storage/${match.team2_logo}`}
                              alt={match.team2}
                              className="w-10 h-10 object-cover rounded-full"
                            />
                          )}
                          {match.team2}
                        </CardTitle>

                        <div className="text-center space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{match.date}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{match.time}</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                          <h4 className="font-semibold text-center mb-3">
                            توقع النتيجة
                          </h4>

                          <div className="flex items-center gap-3 justify-center">
                            <div className="text-center">
                              {match.team1_logo && (
                                <img
                                  src={`${BASE_URL}/storage/${match.team1_logo}`}
                                  alt={match.team1}
                                  className="w-8 h-8 object-cover rounded-full mx-auto mb-1"
                                />
                              )}
                              <p className="text-sm text-muted-foreground mb-2">
                                {match.team1}
                              </p>
                              <Input
                                type="number"
                                placeholder="0"
                                min={0}
                                className="w-16 text-center text-xl font-bold"
                                value={prediction.team1}
                                onChange={(e) =>
                                  handlePredictionChange(
                                    match.id!,
                                    "team1",
                                    e.target.value
                                  )
                                }
                                disabled={isSubmitted}
                              />
                            </div>

                            <div className="text-2xl font-bold text-primary">
                              -
                            </div>

                            <div className="text-center">
                              {match.team2_logo && (
                                <img
                                  src={`${BASE_URL}/storage/${match.team2_logo}`}
                                  alt={match.team2}
                                  className="w-8 h-8 object-cover rounded-full mx-auto mb-1"
                                />
                              )}
                              <p className="text-sm text-muted-foreground mb-2">
                                {match.team2}
                              </p>
                              <Input
                                type="number"
                                placeholder="0"
                                min={0}
                                className="w-16 text-center text-xl font-bold"
                                value={prediction.team2}
                                onChange={(e) =>
                                  handlePredictionChange(
                                    match.id!,
                                    "team2",
                                    e.target.value
                                  )
                                }
                                disabled={isSubmitted}
                              />
                            </div>
                          </div>

                          <Button
                            className="w-full mt-3 shadow-elegant"
                            onClick={() => handleSubmitPrediction(match.id!)}
                            disabled={
                              isSubmitted ||
                              predictionMutation.isPending ||
                              match.status !== "قادمة"
                            }
                          >
                            {match.status !== "قادمة"
                              ? "انتهى وقت التوقع"
                              : isSubmitted
                              ? "تم الإرسال"
                              : "إرسال التوقع"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* جدول المتصدرين */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">جدول المتصدرين</h2>
              <p className="text-muted-foreground">أفضل المتوقعين</p>
            </div>

            <Card className="max-w-2xl mx-auto card-gradient animate-scale-in">
              <CardContent className="p-6">
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    لا يوجد متصدرين حالياً.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {leaderboard.map((item, index) => (
                      <div
                        key={item.user_id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover-lift"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0
                                ? "bg-yellow-500 text-white"
                                : index === 1
                                ? "bg-gray-400 text-white"
                                : index === 2
                                ? "bg-orange-600 text-white"
                                : "bg-muted"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">
                              {item.user?.name || "مستخدم غير معروف"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              مجموع النقاط: {item.total_points}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default Matches;
