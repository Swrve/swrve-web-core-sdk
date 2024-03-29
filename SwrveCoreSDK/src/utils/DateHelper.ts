abstract class DateHelper {
    public static dateToSwrveISOString(date: Date): string {
      return `${date.toISOString().split('.')[0]}Z`;
    }
  
    public static dateToSwrveYYYYMMDDFormat(date: Date): string {
      return date.toISOString().split('T')[0].replace(/-/g , '');
    }
  
    public static dateToUTCDate(date: Date): Date {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
    }

    public static nowInUtcTime(): number {
        return DateHelper.dateToUTCDate(new Date()).getTime();
    }
  }
  
  export default DateHelper;