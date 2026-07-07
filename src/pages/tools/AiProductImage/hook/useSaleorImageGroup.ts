import { ref, onMounted, onUnmounted, watch } from "vue";
import {
  generateShopImageGroup,
  pageShopImageGroup,
} from "@/pages/tools/AiProductImage/api";
import { useAuth } from "@/composables/useAuth";
import { useToast } from "@/composables/useToast";
import { DETAIL_STATUS_GENERATING, PAGE_SIZE, POLL_INTERVAL } from "../utils/constants";
import { formToGenerateReq, groupVoToResult } from "../utils/transform";
import type { SaleorFormData, SaleorResultGroup } from "../utils/types";

const hasInProgress = (groups: SaleorResultGroup[]) =>
  groups.some(
    (group) =>
      group.status === 0 ||
      group.images.some((img) => img.status === DETAIL_STATUS_GENERATING),
  );

export function useSaleorImageGroup() {
  const { isLoggedIn } = useAuth();
  const { addToast } = useToast();
  const results = ref<SaleorResultGroup[]>([]);
  const loading = ref(false);
  const generating = ref(false);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const fetchResults = async (silent = false) => {
    // if (!isLoggedIn.value) {
    //   results.value = [];
    //   stopPolling();
    //   return;
    // }
    if (!silent) loading.value = true;
    try {
      const data = await pageShopImageGroup(1, PAGE_SIZE);
      results.value = (data.list ?? []).map(groupVoToResult);
      // if (hasInProgress(results.value)) {
      //   startPolling();
      // } else {
      //   stopPolling();
      // }
    } catch {
      if (!silent) addToast("获取套图列表失败", "error");
    } finally {
      if (!silent) loading.value = false;
    }
  };

  const startPolling = () => {
    stopPolling();
    pollTimer = setInterval(() => {
      void fetchResults(true);
    }, POLL_INTERVAL);
  };

  const handleGenerate = async (form: SaleorFormData) => {
    try {
      await generateShopImageGroup(formToGenerateReq(form));
      addToast("套图生成任务已提交，正在生成中...", "success");
      await fetchResults(false);
      startPolling();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "生成失败";
      addToast(msg, "error");
    }
  };

  onMounted(() => {
    void fetchResults(false);
  });

  watch(isLoggedIn, (loggedIn) => {
    void fetchResults(false);
    results.value = [];
    stopPolling();
  });

  onUnmounted(stopPolling);

  return {
    results,
    loading,
    generating,
    fetchResults,
    handleGenerate,
  };
}
